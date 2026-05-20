"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Link2Off, LockKeyhole, ShieldAlert } from "lucide-react";

import { InspectorPanel } from "@/features/seating-editor/components/InspectorPanel";
import { SeatingCanvas } from "@/features/seating-editor/components/SeatingCanvas";
import { GuestDataTools } from "@/features/seating-editor/components/GuestDataTools";
import { GuestPanel } from "@/features/seating-editor/components/GuestPanel";
import { GroupsManager } from "@/features/seating-editor/components/GroupsManager";
import { ExportPdfDialog } from "@/features/seating-editor/components/ExportPdfDialog";
import {
  buildGroupMovePlan,
  getAutoMoveTogetherRelationships,
} from "@/features/seating-editor/lib/group-move";
import { formatTableAssignmentsExport } from "@/features/seating-editor/lib/table-assignment-export";
import {
  CompositeEventTransport,
  HttpEventTransport,
  SocketEventTransport,
  type EventTransport,
} from "@/features/seating-editor/lib/event-transport";
import { SeatingToolbar } from "@/features/seating-editor/components/SeatingToolbar";
import { useSeatingEditorStore } from "@/features/seating-editor/store/seating-editor-store";
import type {
  PreferredSeating,
  RelationshipType,
  SeatingRelationship,
} from "@/features/seating-editor/types/relationship.types";
import type { SeatingPlan } from "@/features/seating-editor/types/seating-plan.types";
import type {
  AssignmentMutation,
  AssignmentMutationPayload,
  AssignmentMutationResponse,
  CollaborationEvent,
  CursorAliasToken,
  CursorPresencePayload,
  TableMutation,
  TableMutationPayload,
  TableMutationResponse,
} from "@/features/seating-editor/types/collaboration.types";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { getWeddingRoutes } from "@/lib/routes";
import {
  createRandomCursorAliasToken,
  getStickyCursorAliasToken,
  localizeCursorAlias,
} from "@/lib/cursor-alias";
import { resolveCursorColorKey, type CursorColorKey } from "@/features/seating-editor/lib/cursor-colors";

type SaveState = "idle" | "saving" | "saved" | "error";
type GuestSex = "male" | "female" | "unknown";
type GuestAgeCategory = "adult" | "teen" | "child" | "small_child" | "toddler_0_2";

type ApiPlan = {
  id: string;
  name: string;
  isPublicRead: boolean;
  planVersion: number;
  width: number;
  height: number;
  pairSidePreference?: "auto" | "male-left" | "female-left";
  tables: Array<{
    id: string;
    label: string;
    type: "rectangle";
    x: number;
    y: number;
    rotation: number;
    seatCount: number;
    seatLayout?: "balanced" | "top-only" | "bottom-only";
  }>;
};

type ApiGuest = {
  id: string;
  name: string;
  sex: GuestSex;
  ageCategory: GuestAgeCategory;
  groupId: string | null;
  plannedTableId: string | null;
  group: {
    id: string;
    name: string;
    color: string;
  } | null;
  notes: string | null;
  isPlaceholderPlusOne: boolean;
  plusOneHostGuestId: string | null;
  assignment: {
    id: string;
    seatNumber: number;
    tableId: string;
  } | null;
};

type ApiGroup = {
  id: string;
  planId: string;
  name: string;
  color: string;
  guestCount: number;
};

type GuestImportRow = {
  lineNumber: number;
  name: string;
  include: boolean;
};

type GuestImportSummary = {
  created: number;
  createdPlusOnes: number;
  skippedDuplicates: number;
  skippedInvalidMarkers: number;
  skippedRelationshipConflicts: number;
  warnings: string[];
};

type ApiRelationship = SeatingRelationship;

type ApiPlanAccess = {
  role: "owner" | "editor" | "viewer" | null;
  weddingId: string | null;
  canEdit: boolean;
  isPublicRead: boolean;
  isPublicViewer: boolean;
  isStandalonePlan: boolean;
};

type PlanAccessError = {
  kind: "unauthenticated" | "forbidden" | "notFound" | "generic";
  message?: string;
};

type GuestSyncState = "idle" | "pending" | "failed";
type RemoteCursor = {
  participantId: string;
  displayName: string;
  aliasToken?: CursorAliasToken;
  colorKey?: string;
  x: number;
  y: number;
  updatedAt: number;
  lastMovementAt: number;
};

function normalizePlan(plan: ApiPlan): SeatingPlan {
  return {
    id: plan.id,
    name: plan.name,
    width: plan.width,
    height: plan.height,
    pairSidePreference: plan.pairSidePreference ?? "auto",
    tables: plan.tables.map((table) => ({
      id: table.id,
      label: table.label,
      type: table.type,
      x: table.x,
      y: table.y,
      rotation: table.rotation,
      seatCount: table.seatCount,
      seatLayout: table.seatLayout ?? "balanced",
    })),
  };
}

export function SeatingPlanEditorScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const { data: session } = authClient.useSession();
  const params = useParams<{ planId: string }>();
  const planId = params.planId;

  const {
    plan,
    selection,
    isDirty,
    setPlan,
    markSaved,
    updatePlanName,
    updatePlanPairSidePreference,
    addTable: addTableToStore,
    selectGuest,
    selectTable,
    selectSeat,
    clearSelection,
    updateSelectedTableLabel: updateSelectedTableLabelInStore,
    updateSelectedTableSeatCount: updateSelectedTableSeatCountInStore,
    updateSelectedTableSeatLayout: updateSelectedTableSeatLayoutInStore,
    rotateSelectedTable: rotateSelectedTableInStore,
    deleteSelectedTable: deleteSelectedTableInStore,
    moveTable: moveTableInStore,
  } = useSeatingEditorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<PlanAccessError | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isTableDragging, setIsTableDragging] = useState(false);
  const [mobileGuestsOpen, setMobileGuestsOpen] = useState(false);
  const [mobileTablesOpen, setMobileTablesOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileMoreView, setMobileMoreView] = useState<
    "menu" | "legend" | "data" | "settings"
  >("menu");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileGuestsView, setMobileGuestsView] = useState<"guests" | "groups">("guests");
  const [mobileAddGuestOpen, setMobileAddGuestOpen] = useState(false);
  const [mobileNewGuestName, setMobileNewGuestName] = useState("");
  const [mobileAddGuestError, setMobileAddGuestError] = useState<string | null>(null);
  const [mobileAddGuestSubmitting, setMobileAddGuestSubmitting] = useState(false);
  const [desktopGroupsManagerOpen, setDesktopGroupsManagerOpen] = useState(false);
  const [desktopDataToolsOpen, setDesktopDataToolsOpen] = useState(false);
  const [isExportPdfDialogOpen, setIsExportPdfDialogOpen] = useState(false);
  const [desktopPlanSettingsOpen, setDesktopPlanSettingsOpen] = useState(false);
  const [mobileTableDragEnabled, setMobileTableDragEnabled] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);
  const [isDraggingGuest, setIsDraggingGuest] = useState(false);
  const [linkingSourceGuestId, setLinkingSourceGuestId] = useState<string | null>(null);
  const [guests, setGuests] = useState<ApiGuest[]>([]);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [relationships, setRelationships] = useState<ApiRelationship[]>([]);
  const [isGuestsLoading, setIsGuestsLoading] = useState(true);
  const [guestsError, setGuestsError] = useState<string | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [relationshipsError, setRelationshipsError] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState<{
    name: string;
    sex: GuestSex;
    ageCategory: GuestAgeCategory;
    groupId: string | null;
    notes: string;
  }>({ name: "", sex: "unknown", ageCategory: "adult", groupId: null, notes: "" });
  const [showGroupColors, setShowGroupColors] = useState(false);
  const [planAccess, setPlanAccess] = useState<ApiPlanAccess | null>(null);
  const [isPublicRead, setIsPublicRead] = useState(false);
  const [isUpdatingSharing, setIsUpdatingSharing] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [anonNameOverride, setAnonNameOverride] = useState<string>("");
  const [anonAliasToken, setAnonAliasToken] = useState<CursorAliasToken | null>(null);
  const [anonColorKey, setAnonColorKey] = useState<CursorColorKey>("sky");
  const [, setGuestSyncStateById] = useState<Record<string, GuestSyncState>>({});
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const savePlanRef = useRef<(source: "manual" | "auto") => Promise<void>>(async () => {});
  const pendingAutosaveRef = useRef(false);
  const pendingBackgroundRefreshRef = useRef(false);
  const shouldAutosaveGuestsRef = useRef(false);
  const isTableDraggingRef = useRef(false);
  const isDirtyRef = useRef(isDirty);
  const planRef = useRef(plan);
  const planVersionRef = useRef(0);
  const eventTransportRef = useRef<EventTransport | null>(null);
  const assignmentMutationQueueRef = useRef<Array<{
    mutation: AssignmentMutation;
    coalesceKey: string;
    applySnapshot: ApiGuest[];
    affectedGuestIds: string[];
  }>>([]);
  const tableMutationQueueRef = useRef<Array<{
    mutation: TableMutation;
    coalesceKey: string;
    applySnapshot: SeatingPlan;
  }>>([]);
  const processingAssignmentMutationQueueRef = useRef(false);
  const processingTableMutationQueueRef = useRef(false);
  const dragSessionRef = useRef<string | null>(null);
  const participantIdRef = useRef<string>("");
  const cursorEmitThrottleRef = useRef(0);
  const canEdit = planAccess?.canEdit ?? true;

  if (!participantIdRef.current) {
    participantIdRef.current = crypto.randomUUID();
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    isTableDraggingRef.current = isTableDragging;
  }, [isTableDragging]);

  const selectedTableId = selection?.type === "table" ? selection.tableId : null;
  const selectedGuestId = selection?.type === "guest" ? selection.guestId : null;
  const selectedSeat =
    selection?.type === "seat"
      ? { tableId: selection.tableId, seatNumber: selection.seatNumber }
      : null;

  const selectedGuest = guests.find((guest) => guest.id === selectedGuestId) ?? null;
  const selectedTable = plan.tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedSeatGuest =
    selectedSeat
      ? (guests.find(
          (guest) =>
            guest.assignment?.tableId === selectedSeat.tableId &&
            guest.assignment?.seatNumber === selectedSeat.seatNumber,
        ) ?? null)
      : null;
  const desktopInspectorSelection =
    selection && (selection.type === "table" || selection.type === "guest")
      ? selection
      : null;
  const canvasHighlightedTableId =
    selectedTableId ??
    (selectedSeat ? selectedSeat.tableId : null) ??
    (selectedGuest?.assignment?.tableId ?? null);
  const handleSelectGuest = useCallback(
    (guestId: string | null) => {
      selectGuest(guestId);
      const guest = guests.find((item) => item.id === guestId);
      setGuestForm({
        name: guest?.name ?? "",
        sex: guest?.sex ?? "unknown",
        ageCategory: guest?.ageCategory ?? "adult",
        groupId: guest?.groupId ?? null,
        notes: guest?.notes ?? "",
      });
    },
    [guests, selectGuest],
  );
  const handleLinkingSourceApplied = useCallback(() => {
    setLinkingSourceGuestId(null);
  }, []);
  const handleSelectTableWithMobileInspector = useCallback(
    (tableId: string | null) => {
      selectTable(tableId);
      if (!isDesktopViewport) {
        setMobileInspectorOpen(Boolean(tableId));
      }
    },
    [isDesktopViewport, selectTable],
  );
  const handleSelectSeatWithMobileInspector = useCallback(
    (tableId: string, seatNumber: number) => {
      selectSeat(tableId, seatNumber);
    },
    [selectSeat],
  );
  const startGuestDrag = useCallback((guestId: string) => {
    const sessionId = crypto.randomUUID();
    dragSessionRef.current = sessionId;
    setDraggedGuestId(guestId);
    setIsDraggingGuest(true);
  }, []);
  const endGuestDrag = useCallback((sessionId?: string | null) => {
    if (sessionId && dragSessionRef.current !== sessionId) return;
    dragSessionRef.current = null;
    setDraggedGuestId(null);
    setIsDraggingGuest(false);
  }, []);

  const occupiedSeatCount = guests.filter((guest) => guest.assignment !== null).length;
  const totalSeatCount = plan.tables.reduce((sum, table) => sum + table.seatCount, 0);
  const unseatedGuestCount = guests.length - occupiedSeatCount;
  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return null;
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastSavedAt);
  }, [lastSavedAt]);

  const seatAssignments = useMemo(
    () =>
      guests.reduce<
        Record<
          string,
          Record<
            number,
            {
              guestId: string;
              guestName: string;
              guestGroupColor: string | null;
              guestGroupName: string | null;
            }
          >
        >
      >(
        (acc, guest) => {
          if (!guest.assignment) {
            return acc;
          }
          const tableSeats = acc[guest.assignment.tableId] ?? {};
          tableSeats[guest.assignment.seatNumber] = {
            guestId: guest.id,
            guestName: guest.name,
            guestGroupColor: guest.group?.color ?? null,
            guestGroupName: guest.group?.name ?? null,
          };
          acc[guest.assignment.tableId] = tableSeats;
          return acc;
        },
        {},
      ),
    [guests],
  );
  const tableLabelById = useMemo(
    () =>
      Object.fromEntries(
        plan.tables.map((table) => [table.id, table.label]),
      ) as Record<string, string>,
    [plan.tables],
  );
  const relationshipsByGuestId = useMemo(() => {
    const next: Record<string, ApiRelationship[]> = {};
    for (const relationship of relationships) {
      for (const guestId of relationship.guestIds) {
        if (!next[guestId]) {
          next[guestId] = [];
        }
        next[guestId].push(relationship);
      }
    }
    return next;
  }, [relationships]);

  const loadGuests = useCallback(
    async (options?: { showLoading?: boolean; surfaceErrors?: boolean }) => {
      const showLoading = options?.showLoading ?? true;
      const surfaceErrors = options?.surfaceErrors ?? true;
      if (showLoading) {
        setIsGuestsLoading(true);
      }
      try {
        const guestsResponse = await fetch(`/api/seating-plans/${planId}/guests`, {
          cache: "no-store",
        });

        if (!guestsResponse.ok) throw new Error("Failed to load guests");

        const guestsData = (await guestsResponse.json()) as { guests: ApiGuest[] };
        setGuests(guestsData.guests ?? []);
        setGuestsError(null);
      } catch (error) {
        if (surfaceErrors) {
          setGuestsError(error instanceof Error ? error.message : t("editor.loadGuestsError"));
        }
      } finally {
        if (showLoading) {
          setIsGuestsLoading(false);
        }
      }
    },
    [planId, t],
  );

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/seating-plans/${planId}/groups`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load groups");
      }
      const data = (await response.json()) as { groups: ApiGroup[] };
      setGroups(data.groups ?? []);
      setGroupsError(null);
    } catch (error) {
      setGroupsError(error instanceof Error ? error.message : "Failed to load groups");
    }
  }, [planId]);

  const loadRelationships = useCallback(async (options?: { surfaceErrors?: boolean }) => {
    const surfaceErrors = options?.surfaceErrors ?? true;
    try {
      const response = await fetch(`/api/seating-plans/${planId}/relationships`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load relationships");
      }
      const data = (await response.json()) as { relationships: ApiRelationship[] };
      setRelationships(data.relationships ?? []);
      setRelationshipsError(null);
    } catch (error) {
      if (surfaceErrors) {
        setRelationshipsError(
          error instanceof Error ? error.message : t("editor.loadRelationshipsError"),
        );
      }
    }
  }, [planId, t]);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setSaveState("idle");

        const planResponse = await fetch(`/api/seating-plans/${planId}`, {
          cache: "no-store",
        });

        if (!planResponse.ok) {
          const errorPayload = (await planResponse.json().catch(() => null)) as { error?: string } | null;
          const message = errorPayload?.error;

          if (planResponse.status === 401) {
            setLoadError({ kind: "unauthenticated", message });
          } else if (planResponse.status === 403) {
            setLoadError({ kind: "forbidden", message });
          } else if (planResponse.status === 404) {
            setLoadError({ kind: "notFound", message });
          } else {
            setLoadError({ kind: "generic", message: message ?? t("editor.loadError") });
          }
          return;
        }

        const planData = (await planResponse.json()) as { plan: ApiPlan; access?: ApiPlanAccess };
        setPlan(normalizePlan(planData.plan));
        planVersionRef.current = planData.plan.planVersion ?? 0;
        setPlanAccess(planData.access ?? null);

        if (pathname.startsWith("/seating-plans") && planData.access?.weddingId) {
          router.replace(`/weddings/${planData.access.weddingId}/seating/${planId}`);
          return;
        }

        setIsPublicRead(Boolean(planData.access?.isPublicRead ?? planData.plan.isPublicRead));
        await Promise.all([loadGuests(), loadGroups(), loadRelationships()]);
      } catch (error) {
        setLoadError({
          kind: "generic",
          message: error instanceof Error ? error.message : t("editor.loadError"),
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (planId) void loadPlan();
  }, [loadGroups, loadGuests, loadRelationships, pathname, planId, router, setPlan]);

  useEffect(() => {
    if (session?.user?.name) return;
    if (anonNameOverride.trim()) return;
    if (anonAliasToken) return;
    setAnonAliasToken(getStickyCursorAliasToken(locale));
  }, [anonAliasToken, anonNameOverride, locale, session?.user?.name]);

  const getDisplayName = useCallback(() => {
    const sessionName = session?.user?.name?.trim();
    if (sessionName) return sessionName;
    const override = anonNameOverride.trim();
    if (override) return override;
    return localizeCursorAlias(anonAliasToken ?? getStickyCursorAliasToken(locale), locale);
  }, [anonAliasToken, anonNameOverride, locale, session?.user?.name]);
  const hasAnonNameOverride = anonNameOverride.trim().length > 0;

  useEffect(() => {
    setRemoteCursors((current) =>
      current.map((cursor) => ({
        ...cursor,
        displayName: cursor.aliasToken ? localizeCursorAlias(cursor.aliasToken, locale) : cursor.displayName,
      })),
    );
  }, [locale]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemoteCursors((current) => (current.length === 0 ? current : [...current]));
    }, 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const httpTransport = new HttpEventTransport(planId);
    const socketTransport = new SocketEventTransport(
      planId,
      async () => {
        const response = await fetch(`/api/seating-plans/${planId}/realtime-auth`, {
          method: "POST",
        });
        const payload = (await response.json()) as { token?: string };
        if (!response.ok || !payload.token) {
          throw new Error("Failed to authorize realtime transport");
        }
        return payload.token;
      },
      () => ({
        participantId: participantIdRef.current,
        displayName: getDisplayName(),
        aliasToken:
          session?.user?.name || hasAnonNameOverride
            ? undefined
            : anonAliasToken ?? getStickyCursorAliasToken(locale),
        colorKey: session?.user?.name ? undefined : anonColorKey,
      }),
    );
    const composite = new CompositeEventTransport(socketTransport, httpTransport);
    eventTransportRef.current = composite;

    const unsubscribeRemote =
      composite.subscribeToRemoteEvents?.((event: CollaborationEvent) => {
        if (event.serverVersion <= planVersionRef.current) return;
        planVersionRef.current = event.serverVersion;
        if (event.entityType === "assignment") {
          void loadGuests({ showLoading: false, surfaceErrors: false });
          return;
        }
        if (
          processingTableMutationQueueRef.current ||
          tableMutationQueueRef.current.length > 0
        ) {
          return;
        }
        void fetch(`/api/seating-plans/${planId}`, { cache: "no-store" })
          .then((response) => response.json())
          .then((payload: { plan?: ApiPlan }) => {
            if (!payload.plan) return;
            const fetchedVersion = payload.plan.planVersion ?? 0;
            if (fetchedVersion < planVersionRef.current) return;
            setPlan(normalizePlan(payload.plan), { preserveSelection: true });
            planVersionRef.current = fetchedVersion;
          })
          .catch(() => {});
      }) ?? (() => {});

    const unsubscribeReconnect =
      composite.onReconnect?.(() => {
        void Promise.all([
          fetch(`/api/seating-plans/${planId}`, { cache: "no-store" })
            .then((response) => response.json())
            .then((payload: { plan?: ApiPlan }) => {
              if (!payload.plan) return;
              if (
                processingTableMutationQueueRef.current ||
                tableMutationQueueRef.current.length > 0
              ) {
                return;
              }
              const fetchedVersion = payload.plan.planVersion ?? 0;
              if (fetchedVersion < planVersionRef.current) return;
              setPlan(normalizePlan(payload.plan), { preserveSelection: true });
              planVersionRef.current = fetchedVersion;
            })
            .catch(() => {}),
          loadGuests({ showLoading: false, surfaceErrors: false }),
          loadRelationships({ surfaceErrors: false }),
        ]);
      }) ?? (() => {});

    const unsubscribeCursors =
      composite.subscribeToCursorPresence?.((presence: CursorPresencePayload) => {
        if (!presence?.participantId || presence.participantId === participantIdRef.current) return;
        if (presence.kind === "leave") {
          setRemoteCursors((current) =>
            current.filter((cursor) => cursor.participantId !== presence.participantId),
          );
          return;
        }

        const now = Date.now();
        setRemoteCursors((current) => {
          const next = [...current];
          const existingIndex = next.findIndex(
            (cursor) => cursor.participantId === presence.participantId,
          );

          if (existingIndex < 0) {
            next.push({
              participantId: presence.participantId,
              displayName: presence.aliasToken
                ? localizeCursorAlias(presence.aliasToken, locale)
                : presence.displayName,
              aliasToken: presence.aliasToken,
              colorKey: resolveCursorColorKey(presence.colorKey),
              x: presence.x,
              y: presence.y,
              updatedAt: now,
              lastMovementAt: now,
            });
            return next;
          }

          const existing = next[existingIndex];
          const moved =
            Math.abs(existing.x - presence.x) > 0.01 || Math.abs(existing.y - presence.y) > 0.01;
          next[existingIndex] = {
            ...existing,
            displayName: presence.aliasToken
              ? localizeCursorAlias(presence.aliasToken, locale)
              : presence.displayName,
            aliasToken: presence.aliasToken ?? existing.aliasToken,
            colorKey: resolveCursorColorKey(presence.colorKey) ?? existing.colorKey,
            x: presence.x,
            y: presence.y,
            updatedAt: now,
            lastMovementAt: moved ? now : existing.lastMovementAt,
          };
          return next;
        });
      }) ?? (() => {});

    const staleCursorCleanup = window.setInterval(() => {
      const cutoff = Date.now() - 10_000;
      setRemoteCursors((current) => current.filter((cursor) => cursor.updatedAt >= cutoff));
    }, 2_000);

    return () => {
      unsubscribeRemote();
      unsubscribeReconnect();
      unsubscribeCursors();
      window.clearInterval(staleCursorCleanup);
      composite.dispose?.();
      if (eventTransportRef.current === composite) {
        eventTransportRef.current = null;
      }
    };
  }, [anonAliasToken, anonColorKey, getDisplayName, hasAnonNameOverride, loadGuests, loadRelationships, locale, planId, session?.user?.name, setPlan]);

  const handlePointerPresenceChange = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorEmitThrottleRef.current < 60) return;
    cursorEmitThrottleRef.current = now;
    void eventTransportRef.current?.sendCursorPresence?.({
      x,
      y,
      aliasToken:
        session?.user?.name || hasAnonNameOverride
          ? undefined
          : anonAliasToken ?? getStickyCursorAliasToken(locale),
    });
  }, [anonAliasToken, hasAnonNameOverride, locale, session?.user?.name]);

  const viewingAsLabel = session?.user?.name ? null : getDisplayName();
  const backHref = planAccess?.weddingId ? getWeddingRoutes(planAccess.weddingId).dashboard : "/weddings";
  const anonIdentity = session?.user?.name
    ? null
    : {
        label: viewingAsLabel ?? "",
        nameInput: anonNameOverride,
        colorKey: anonColorKey,
        onNameInputChange: (value: string) => setAnonNameOverride(value),
        onRandomize: () => {
          setAnonNameOverride("");
          setAnonAliasToken(createRandomCursorAliasToken(locale));
        },
        onReset: () => {
          setAnonNameOverride("");
          setAnonAliasToken(getStickyCursorAliasToken(locale));
          setAnonColorKey("sky");
        },
        onColorKeyChange: (value: string) => setAnonColorKey(resolveCursorColorKey(value)),
      };

  const markGuestSyncState = useCallback((guestIds: string[], state: GuestSyncState) => {
    setGuestSyncStateById((current) => {
      const next = { ...current };
      for (const guestId of guestIds) {
        next[guestId] = state;
      }
      return next;
    });
  }, []);

  const applySnapshotDeltaToGuests = useCallback((result: AssignmentMutationResponse) => {
    const delta = result.snapshotDelta;
    if (!delta) return;
    const byGuestId = Object.fromEntries(delta.guestsAssignments.map((item) => [item.guestId, item]));
    setGuests((current) =>
      current.map((guest) => {
        const next = byGuestId[guest.id];
        if (!next) return guest;
        return {
          ...guest,
          plannedTableId: next.plannedTableId,
          assignment: next.assignment
            ? {
                id: next.assignment.id,
                tableId: next.assignment.tableId,
                seatNumber: next.assignment.seatNumber,
              }
            : null,
        };
      }),
    );
  }, []);

  const applySnapshotDeltaToPlan = useCallback((result: TableMutationResponse) => {
    const delta = result.snapshotDelta;
    if (!delta) return;

    setPlan(
      {
        ...planRef.current,
        tables: (() => {
          let nextTables = [...planRef.current.tables];
          if (delta.removedTableIds?.length) {
            const removed = new Set(delta.removedTableIds);
            nextTables = nextTables.filter((table) => !removed.has(table.id));
          }
          for (const item of delta.tables) {
            if (!item.table) continue;
            const index = nextTables.findIndex((table) => table.id === item.table!.id);
            if (index >= 0) {
              nextTables[index] = item.table;
            } else {
              nextTables.push(item.table);
            }
          }
          return nextTables;
        })(),
      },
      { preserveSelection: true },
    );
  }, [setPlan]);

  const processAssignmentMutationQueue = useCallback(async () => {
    if (processingAssignmentMutationQueueRef.current) return;
    processingAssignmentMutationQueueRef.current = true;
    try {
      while (assignmentMutationQueueRef.current.length > 0) {
        const queued = assignmentMutationQueueRef.current[0];
        const result = await eventTransportRef.current!.sendAssignmentMutation(queued.mutation);
        if (result.error || result.ack.status === "rejected") {
          setGuests(queued.applySnapshot);
          markGuestSyncState(queued.affectedGuestIds, "failed");
          setGuestsError(result.error ?? t("canvas.failedAssign"));
        } else {
          planVersionRef.current = result.ack.planVersion;
          applySnapshotDeltaToGuests(result);
          markGuestSyncState(queued.affectedGuestIds, "idle");
          setGuestsError(null);
        }
        assignmentMutationQueueRef.current.shift();
      }
    } finally {
      processingAssignmentMutationQueueRef.current = false;
    }
  }, [applySnapshotDeltaToGuests, markGuestSyncState, t]);

  const processTableMutationQueue = useCallback(async () => {
    if (processingTableMutationQueueRef.current) return;
    processingTableMutationQueueRef.current = true;
    try {
      while (tableMutationQueueRef.current.length > 0) {
        const queued = tableMutationQueueRef.current[0];
        const result = await eventTransportRef.current!.sendTableMutation(queued.mutation);
        if (result.error || result.ack.status === "rejected") {
          setPlan(queued.applySnapshot, { preserveSelection: true });
        } else {
          planVersionRef.current = result.ack.planVersion;
          const hasNewerQueuedForSameCoalesceKey = tableMutationQueueRef.current
            .slice(1)
            .some((item) => item.coalesceKey === queued.coalesceKey);
          if (!hasNewerQueuedForSameCoalesceKey) {
            applySnapshotDeltaToPlan(result);
          }
        }
        tableMutationQueueRef.current.shift();
      }
    } finally {
      processingTableMutationQueueRef.current = false;
    }
  }, [applySnapshotDeltaToPlan, setPlan]);

  const enqueueAssignmentMutation = useCallback((args: {
    intent: AssignmentMutation["intent"];
    payload: AssignmentMutationPayload;
    coalesceKey: string;
    affectedGuestIds: string[];
    applySnapshot: ApiGuest[];
  }) => {
    const mutationId = crypto.randomUUID();
    const mutation: AssignmentMutation = {
      mutationId,
      baseVersion: planVersionRef.current,
      intent: args.intent,
      payload: args.payload,
      createdAt: new Date().toISOString(),
    };
    const nextItem = {
      mutation,
      coalesceKey: args.coalesceKey,
      affectedGuestIds: args.affectedGuestIds,
      applySnapshot: args.applySnapshot,
    };
    const currentQueue = assignmentMutationQueueRef.current;
    if (processingAssignmentMutationQueueRef.current && currentQueue.length > 0) {
      const [activeItem, ...pendingItems] = currentQueue;
      assignmentMutationQueueRef.current = [
        activeItem,
        ...pendingItems.filter((item) => item.coalesceKey !== args.coalesceKey),
        nextItem,
      ];
    } else {
      assignmentMutationQueueRef.current = [
        ...currentQueue.filter((item) => item.coalesceKey !== args.coalesceKey),
        nextItem,
      ];
    }
    markGuestSyncState(args.affectedGuestIds, "pending");
    void processAssignmentMutationQueue();
  }, [markGuestSyncState, processAssignmentMutationQueue]);

  const enqueueTableMutation = useCallback((args: {
    intent: TableMutation["intent"];
    payload: TableMutationPayload;
    coalesceKey: string;
    applySnapshot: SeatingPlan;
  }) => {
    const mutationId = crypto.randomUUID();
    const mutation: TableMutation = {
      mutationId,
      baseVersion: planVersionRef.current,
      intent: args.intent,
      payload: args.payload,
      createdAt: new Date().toISOString(),
    };
    const nextItem = {
      mutation,
      coalesceKey: args.coalesceKey,
      applySnapshot: args.applySnapshot,
    };
    const currentQueue = tableMutationQueueRef.current;
    if (processingTableMutationQueueRef.current && currentQueue.length > 0) {
      const [activeItem, ...pendingItems] = currentQueue;
      tableMutationQueueRef.current = [
        activeItem,
        ...pendingItems.filter((item) => item.coalesceKey !== args.coalesceKey),
        nextItem,
      ];
    } else {
      tableMutationQueueRef.current = [
        ...currentQueue.filter((item) => item.coalesceKey !== args.coalesceKey),
        nextItem,
      ];
    }
    void processTableMutationQueue();
  }, [processTableMutationQueue]);

  const handleUnassignGuest = useCallback(async (_assignmentId: string, guestId: string) => {
    setGuestsError(null);
    const previousGuests = guests;
    setGuests((current) =>
      current.map((guest) =>
        guest.id === guestId
          ? { ...guest, assignment: null, plannedTableId: null }
          : guest,
      ),
    );
    enqueueAssignmentMutation({
      intent: "unassign",
      payload: { guestId },
      coalesceKey: `guest:${guestId}`,
      affectedGuestIds: [guestId],
      applySnapshot: previousGuests,
    });
  }, [enqueueAssignmentMutation, guests]);

  const handleSeatAssign = useCallback(async (
    tableId: string,
    seatNumber: number,
    guestId: string | null,
  ) => {
    setGuestsError(null);
    const previousGuests = guests;
    const clickedGuest = guests.find(
      (guest) => guest.assignment?.tableId === tableId && guest.assignment?.seatNumber === seatNumber,
    );

    if (!guestId) {
      if (!clickedGuest) return { level: "info" as const, message: t("inspector.unassigned") };
      setGuests((current) =>
        current.map((guest) =>
          guest.id === clickedGuest.id ? { ...guest, assignment: null, plannedTableId: null } : guest,
        ),
      );
      enqueueAssignmentMutation({
        intent: "unassign",
        payload: { guestId: clickedGuest.id },
        coalesceKey: `guest:${clickedGuest.id}`,
        affectedGuestIds: [clickedGuest.id],
        applySnapshot: previousGuests,
      });
      return { level: "success" as const, message: t("canvas.unassignSeat") };
    }

    const targetGuest = guests.find((guest) => guest.id === guestId);
    if (!targetGuest) throw new Error("Guest not found");

    const autoMoveRelationships = getAutoMoveTogetherRelationships(targetGuest.id, relationshipsByGuestId);
    if (autoMoveRelationships.length > 0) {
      const planResult = buildGroupMovePlan({
        initiatorGuestId: targetGuest.id,
        targetTableId: tableId,
        targetSeatNumber: seatNumber,
        pairSidePreference: plan.pairSidePreference === "auto" ? undefined : plan.pairSidePreference,
        tables: plan.tables.map((table) => ({
          id: table.id,
          x: table.x,
          y: table.y,
          seatCount: table.seatCount,
        })),
        guests: guests.map((guest) => ({
          id: guest.id,
          sex: guest.sex,
          assignment: guest.assignment
            ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
            : null,
        })),
        relationships: autoMoveRelationships,
      });
      if (!planResult.ok) throw new Error(planResult.error);

      const plannedAssignmentsByGuestId = Object.fromEntries(
        planResult.assignments.map((assignment) => [assignment.guestId, assignment]),
      );
      const affectedGuestIds = planResult.assignments.map((assignment) => assignment.guestId);
      setGuests((current) =>
        current.map((guest) => {
          const assignment = plannedAssignmentsByGuestId[guest.id];
          if (!assignment) return guest;
          return {
            ...guest,
            plannedTableId: assignment.tableId,
            assignment: {
              id: guest.assignment?.id ?? `optimistic-${guest.id}`,
              tableId: assignment.tableId,
              seatNumber: assignment.seatNumber,
            },
          };
        }),
      );
      enqueueAssignmentMutation({
        intent: "batch_move",
        payload: {
          initiatorGuestId: targetGuest.id,
          targetTableId: tableId,
          targetSeatNumber: seatNumber,
          moveTogetherEnabled: true,
          plannedAssignments: planResult.assignments,
          context: { relationshipIdsConsidered: planResult.relationshipIdsConsidered },
        },
        coalesceKey: `guest:${targetGuest.id}`,
        affectedGuestIds,
        applySnapshot: previousGuests,
      });
      return {
        level: "success" as const,
        message: t("canvas.groupMove", { count: planResult.assignments.length }),
      };
    }

    if (
      targetGuest.assignment?.tableId === tableId &&
      targetGuest.assignment?.seatNumber === seatNumber
    ) {
      return { level: "info" as const, message: t("canvas.selectedSeat") };
    }

    setGuests((current) =>
      current.map((guest) => {
        if (guest.id === targetGuest.id) {
          return {
            ...guest,
            plannedTableId: tableId,
            assignment: {
              id: guest.assignment?.id ?? `optimistic-${guest.id}`,
              tableId,
              seatNumber,
            },
          };
        }
        if (clickedGuest && guest.id === clickedGuest.id && targetGuest.assignment) {
          return {
            ...guest,
            plannedTableId: targetGuest.assignment.tableId,
            assignment: {
              id: guest.assignment?.id ?? `optimistic-${guest.id}`,
              tableId: targetGuest.assignment.tableId,
              seatNumber: targetGuest.assignment.seatNumber,
            },
          };
        }
        return guest;
      }),
    );
    enqueueAssignmentMutation({
      intent: "assign",
      payload: { guestId: targetGuest.id, tableId, seatNumber },
      coalesceKey: `guest:${targetGuest.id}`,
      affectedGuestIds: clickedGuest ? [targetGuest.id, clickedGuest.id] : [targetGuest.id],
      applySnapshot: previousGuests,
    });
    if (clickedGuest && targetGuest.assignment) return { level: "success" as const, message: t("editor.occupied") };
    return { level: "success" as const, message: t("editor.seatAssigned") };
  }, [enqueueAssignmentMutation, guests, plan.pairSidePreference, plan.tables, relationshipsByGuestId, t]);
  const dropGuestOnSeat = useCallback(
    async (tableId: string, seatNumber: number, guestId: string) => {
      if (!isDesktopViewport) return;
      if (isTableDraggingRef.current) return;
      const dragSession = dragSessionRef.current;
      endGuestDrag(dragSession);
      try {
        const result = await handleSeatAssign(tableId, seatNumber, guestId);
        if (result?.message) {
          toast({
            variant: result.level === "info" ? "info" : "success",
            title: result.level === "info" ? t("toasts.info") : t("toasts.success"),
            description: result.message,
          });
        }
      } catch (error) {
        setGuestsError(error instanceof Error ? error.message : t("canvas.failedAssign"));
      }
    },
    [endGuestDrag, handleSeatAssign, isDesktopViewport, t],
  );

  const handleMoveTable = useCallback((tableId: string, nextX: number, nextY: number) => {
    if (!canEdit) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    moveTableInStore(tableId, nextX, nextY);
    const nextPlan = useSeatingEditorStore.getState().plan;
    const nextTable = nextPlan.tables.find((table) => table.id === tableId);
    if (!nextTable) return;
    enqueueTableMutation({
      intent: "move_table",
      payload: { tableId, x: nextTable.x, y: nextTable.y },
      coalesceKey: `table:${tableId}:position`,
      applySnapshot: previousPlan,
    });
  }, [canEdit, enqueueTableMutation, moveTableInStore]);

  const handleAddTable = useCallback(() => {
    if (!canEdit) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    addTableToStore();
    const nextPlan = useSeatingEditorStore.getState().plan;
    const nextTable = nextPlan.tables.find(
      (table) => !previousPlan.tables.some((current) => current.id === table.id),
    );
    if (!nextTable) return;
    enqueueTableMutation({
      intent: "add_table",
      payload: { table: nextTable },
      coalesceKey: `table:${nextTable.id}:add`,
      applySnapshot: previousPlan,
    });
  }, [addTableToStore, canEdit, enqueueTableMutation]);

  const handleUpdateSelectedTableLabel = useCallback((label: string) => {
    if (!canEdit || !selectedTableId) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    updateSelectedTableLabelInStore(label);
    const nextPlan = useSeatingEditorStore.getState().plan;
    const nextTable = nextPlan.tables.find((table) => table.id === selectedTableId);
    if (!nextTable) return;
    enqueueTableMutation({
      intent: "update_table",
      payload: { tableId: selectedTableId, label: nextTable.label },
      coalesceKey: `table:${selectedTableId}:meta`,
      applySnapshot: previousPlan,
    });
  }, [canEdit, enqueueTableMutation, selectedTableId, updateSelectedTableLabelInStore]);

  const handleUpdateSelectedTableSeatCount = useCallback((seatCount: number) => {
    if (!canEdit || !selectedTableId) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    updateSelectedTableSeatCountInStore(seatCount);
    const nextPlan = useSeatingEditorStore.getState().plan;
    const nextTable = nextPlan.tables.find((table) => table.id === selectedTableId);
    if (!nextTable) return;
    enqueueTableMutation({
      intent: "update_table",
      payload: {
        tableId: selectedTableId,
        seatCount: nextTable.seatCount,
      },
      coalesceKey: `table:${selectedTableId}:meta`,
      applySnapshot: previousPlan,
    });
  }, [canEdit, enqueueTableMutation, selectedTableId, updateSelectedTableSeatCountInStore]);

  const handleUpdateSelectedTableSeatLayout = useCallback((seatLayout: "balanced" | "top-only" | "bottom-only") => {
    if (!canEdit || !selectedTableId) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    updateSelectedTableSeatLayoutInStore(seatLayout);
    const nextPlan = useSeatingEditorStore.getState().plan;
    const nextTable = nextPlan.tables.find((table) => table.id === selectedTableId);
    if (!nextTable) return;
    enqueueTableMutation({
      intent: "update_table",
      payload: {
        tableId: selectedTableId,
        seatLayout: nextTable.seatLayout,
      },
      coalesceKey: `table:${selectedTableId}:meta`,
      applySnapshot: previousPlan,
    });
  }, [canEdit, enqueueTableMutation, selectedTableId, updateSelectedTableSeatLayoutInStore]);

  const handleRotateSelectedTable = useCallback(() => {
    if (!canEdit || !selectedTableId) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    rotateSelectedTableInStore();
    const nextPlan = useSeatingEditorStore.getState().plan;
    const nextTable = nextPlan.tables.find((table) => table.id === selectedTableId);
    if (!nextTable) return;
    enqueueTableMutation({
      intent: "rotate_table",
      payload: {
        tableId: selectedTableId,
        rotation: nextTable.rotation,
      },
      coalesceKey: `table:${selectedTableId}:rotation`,
      applySnapshot: previousPlan,
    });
  }, [canEdit, enqueueTableMutation, rotateSelectedTableInStore, selectedTableId]);

  const handleDeleteSelectedTable = useCallback(() => {
    if (!canEdit || !selectedTableId) return;
    const previousPlan = useSeatingEditorStore.getState().plan;
    deleteSelectedTableInStore();
    enqueueTableMutation({
      intent: "delete_table",
      payload: { tableId: selectedTableId },
      coalesceKey: `table:${selectedTableId}:delete`,
      applySnapshot: previousPlan,
    });
  }, [canEdit, deleteSelectedTableInStore, enqueueTableMutation, selectedTableId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";
      if (isTypingInField) return;

      if (!canEdit) {
        if (event.key === "Escape") {
          event.preventDefault();
          clearSelection();
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedTableId) {
        event.preventDefault();
        handleDeleteSelectedTable();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
      }

      if (event.key.toLowerCase() === "u" && selectedGuest?.assignment) {
        event.preventDefault();
        void handleUnassignGuest(selectedGuest.assignment.id, selectedGuest.id);
      }

      if (event.key === "]" && guests.length > 0) {
        event.preventDefault();
        const currentIndex = guests.findIndex((guest) => guest.id === selectedGuestId);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % guests.length;
        handleSelectGuest(guests[nextIndex].id);
      }

      if (event.key === "[" && guests.length > 0) {
        event.preventDefault();
        const currentIndex = guests.findIndex((guest) => guest.id === selectedGuestId);
        const prevIndex =
          currentIndex < 0 ? guests.length - 1 : (currentIndex - 1 + guests.length) % guests.length;
        handleSelectGuest(guests[prevIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearSelection,
    handleDeleteSelectedTable,
    guests,
    handleSelectGuest,
    canEdit,
    selectedGuest,
    selectedGuestId,
    selectedTableId,
    handleUnassignGuest,
  ]);

  const savePlan = async (source: "manual" | "auto") => {
      if (saveInFlightRef.current) {
        if (source === "auto") {
          pendingAutosaveRef.current = true;
        }
        return;
      }

      if (
        source === "auto" &&
        !isDirtyRef.current &&
        !shouldAutosaveGuestsRef.current
      ) {
        return;
      }
      if (source === "auto" && isTableDraggingRef.current) {
        pendingAutosaveRef.current = true;
        return;
      }

      saveInFlightRef.current = true;
      try {
        setSaveState("saving");
        const nextPlan = planRef.current;
        const response = await fetch(`/api/seating-plans/${nextPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextPlan.name,
          width: nextPlan.width,
          height: nextPlan.height,
          pairSidePreference: nextPlan.pairSidePreference,
          tables: nextPlan.tables.map((table) => ({
            id: table.id,
            label: table.label,
            type: table.type,
            x: table.x,
            y: table.y,
            rotation: table.rotation,
            seatCount: table.seatCount,
            seatLayout: table.seatLayout,
          })),
        }),
      });
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to save seating plan");
        }
        const payload = (await response.json()) as { plan?: ApiPlan };
        const didPlanChangeDuringSave = planRef.current !== nextPlan;
        if (payload.plan && !didPlanChangeDuringSave) {
          const savedVersion = payload.plan.planVersion ?? 0;
          if (savedVersion >= planVersionRef.current) {
            setPlan(normalizePlan(payload.plan), { preserveSelection: true });
            planVersionRef.current = savedVersion;
          }
        }
        if (!didPlanChangeDuringSave) {
          shouldAutosaveGuestsRef.current = false;
          markSaved();
          setSaveState("saved");
          setLastSavedAt(new Date());
          setTimeout(() => setSaveState("idle"), 1200);
          if (!isDraggingGuest) {
            void Promise.all([
              loadGuests({ showLoading: false, surfaceErrors: false }),
              loadRelationships({ surfaceErrors: false }),
            ]);
          } else {
            pendingBackgroundRefreshRef.current = true;
          }
        } else {
          // User kept editing while the request was in-flight; don't clobber local state.
          setSaveState("idle");
        }
      } catch {
        setSaveState("error");
      } finally {
        saveInFlightRef.current = false;
        if (
          pendingAutosaveRef.current &&
          (isDirtyRef.current || shouldAutosaveGuestsRef.current)
        ) {
          pendingAutosaveRef.current = false;
          void savePlan("auto");
        } else {
          pendingAutosaveRef.current = false;
        }
      }
    };
  useEffect(() => {
    savePlanRef.current = savePlan;
  }, [savePlan]);

  const scheduleAutosave = useCallback(() => {
    if (isTableDraggingRef.current) {
      pendingAutosaveRef.current = true;
      return;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void savePlanRef.current("auto");
    }, 1000);
  }, []);

  const handleSave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await savePlanRef.current("manual");
  }, []);

  const handleCreateGuest = useCallback(async (payload: {
    name: string;
    sex?: GuestSex;
    ageCategory?: GuestAgeCategory;
    groupId?: string | null;
    notes?: string;
  }) => {
    setGuestsError(null);
    const trimmedName = payload.name.trim();
    if (!trimmedName) return;
    const response = await fetch(`/api/seating-plans/${planId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmedName,
        sex: payload.sex ?? "unknown",
        ageCategory: payload.ageCategory ?? "adult",
        groupId: payload.groupId ?? undefined,
        notes: payload.notes?.trim() ? payload.notes.trim() : undefined,
      }),
    });
    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = errorData?.error ?? "Failed to create guest";
      setGuestsError(message);
      throw new Error(message);
    }
    const data = (await response.json()) as { guest: ApiGuest };
    setGuests((current) => [...current, data.guest]);
    shouldAutosaveGuestsRef.current = true;
    scheduleAutosave();
  }, [planId, scheduleAutosave]);

  const handleCreateGuestFromMobileSheet = useCallback(async () => {
    const trimmed = mobileNewGuestName.trim();
    if (!trimmed) return;
    setMobileAddGuestSubmitting(true);
    setMobileAddGuestError(null);
    try {
      await handleCreateGuest({ name: trimmed });
      setMobileNewGuestName("");
      setMobileAddGuestOpen(false);
    } catch (error) {
      setMobileAddGuestError(error instanceof Error ? error.message : "Failed to create guest");
    } finally {
      setMobileAddGuestSubmitting(false);
    }
  }, [handleCreateGuest, mobileNewGuestName]);

  const handleOpenLegend = useCallback(() => {
    window.dispatchEvent(new Event("mobile-open-legend"));
  }, []);

  const handleTogglePublicRead = useCallback(
    async (nextValue: boolean) => {
      if (!canEdit || isUpdatingSharing) return;

      const previous = isPublicRead;
      setIsPublicRead(nextValue);
      setIsUpdatingSharing(true);

      try {
        const response = await fetch(`/api/seating-plans/${planId}/sharing`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublicRead: nextValue }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorData?.error ?? "Failed to update sharing settings");
        }

        const payload = (await response.json()) as {
          plan?: { isPublicRead: boolean };
          access?: ApiPlanAccess;
        };

        const resolvedPublicRead = payload.plan?.isPublicRead ?? nextValue;
        setIsPublicRead(resolvedPublicRead);
        if (payload.access) {
          setPlanAccess(payload.access);
        }
        toast({
          title: t("toasts.success"),
          description: resolvedPublicRead
            ? t("planSettings.publicReadEnabled")
            : t("planSettings.publicReadDisabled"),
          variant: "success",
        });
      } catch (error) {
        setIsPublicRead(previous);
        toast({
          title: t("editor.saveTitleError"),
          description: error instanceof Error ? error.message : t("planSettings.publicReadUpdateError"),
          variant: "destructive",
        });
      } finally {
        setIsUpdatingSharing(false);
      }
    },
    [canEdit, isPublicRead, isUpdatingSharing, planId, t],
  );

  const handleCreateGroup = useCallback(
    async (name: string) => {
      const response = await fetch(`/api/seating-plans/${planId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error ?? "Failed to create group");
      }
      const data = (await response.json()) as { group: ApiGroup };
      setGroups((current) => [...current, data.group]);
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
      return data.group;
    },
    [planId, scheduleAutosave],
  );

  const handleUpdateGroup = useCallback(
    async (groupId: string, payload: Partial<{ name: string; color: string }>) => {
      const response = await fetch(`/api/seating-plans/${planId}/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error ?? "Failed to update group");
      }
      const data = (await response.json()) as { group: ApiGroup };
      setGroups((current) =>
        current.map((group) => (group.id === groupId ? data.group : group)),
      );
      setGuests((current) =>
        current.map((guest) =>
          guest.group?.id === groupId
            ? {
                ...guest,
                group: {
                  id: data.group.id,
                  name: data.group.name,
                  color: data.group.color,
                },
              }
            : guest,
        ),
      );
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
      return data.group;
    },
    [planId, scheduleAutosave],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      const response = await fetch(`/api/seating-plans/${planId}/groups/${groupId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error ?? "Failed to delete group");
      }
      setGroups((current) => current.filter((group) => group.id !== groupId));
      setGuests((current) =>
        current.map((guest) =>
          guest.groupId === groupId
            ? {
                ...guest,
                groupId: null,
                group: null,
              }
            : guest,
        ),
      );
      setGuestForm((current) =>
        current.groupId === groupId ? { ...current, groupId: null } : current,
      );
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
    },
    [planId, scheduleAutosave],
  );

  const handleBulkImportGuests = useCallback(
    async (rows: GuestImportRow[]): Promise<GuestImportSummary> => {
      const response = await fetch(`/api/seating-plans/${planId}/guests/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error ?? "Failed to import guests");
      }

      const data = (await response.json()) as {
        guests: ApiGuest[];
        relationships: ApiRelationship[];
        summary: GuestImportSummary;
      };

      if (data.guests.length > 0) {
        setGuests((current) => [...current, ...data.guests]);
      }
      if (data.relationships.length > 0) {
        setRelationships((current) => [...current, ...data.relationships]);
      }
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
      return data.summary;
    },
    [planId, scheduleAutosave],
  );

  const handleExportGuestsCsv = useCallback(() => {
    const header = "name,group,notes";
    const rows = guests.map((guest) =>
      [guest.name, guest.group?.name ?? "", guest.notes ?? ""]
        .map((value) => `"${value.replaceAll("\"", "\"\"")}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "guests.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [guests]);

  const handleExportTableList = useCallback(() => {
    const text = formatTableAssignmentsExport(
      plan.tables,
      guests.map((guest) => ({
        name: guest.isPlaceholderPlusOne
          ? t("guestPanel.plusOnePlaceholderName")
          : guest.name,
        assignment: guest.assignment,
      })),
      locale,
    );
    const sanitizedPlanName = plan.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const filename = `seating-plan-${sanitizedPlanName || "plan"}-tables.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [guests, locale, plan.name, plan.tables, t]);

  const handleExportPdf = useCallback(
    async (options: {
      paper: "A4" | "A3";
      orientation: "landscape" | "portrait";
      includeEmptySeats: boolean;
      overviewShowSeats: boolean;
      detailSeatLabelMode: "number" | "initials";
    }) => {
      const query = new URLSearchParams({
        paper: options.paper,
        orientation: options.orientation,
        includeEmptySeats: options.includeEmptySeats ? "1" : "0",
        overviewShowSeats: options.overviewShowSeats ? "1" : "0",
        detailSeatLabelMode: options.detailSeatLabelMode,
        locale,
      });

      const response = await fetch(`/api/seating-plans/${planId}/export/pdf?${query.toString()}`);
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string; requestId?: string }
          | null;
        const details = {
          planId,
          status: response.status,
          statusText: response.statusText,
          requestId: errorPayload?.requestId,
          options,
        };
        console.error("seating_pdf_export_request_failed", details);
        const message = errorPayload?.requestId
          ? `${errorPayload?.error ?? "Failed to export PDF"} (request: ${errorPayload.requestId})`
          : (errorPayload?.error ?? "Failed to export PDF");
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const sanitizedPlanName = plan.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const filename = `seating-plan-${sanitizedPlanName || "plan"}.pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [locale, plan.name, planId],
  );

  const handleUpdateGuest = useCallback(async (
    guestId: string,
    payload: {
      name: string;
      sex: GuestSex;
      ageCategory: GuestAgeCategory;
      groupId: string | null;
      notes: string;
      plannedTableId?: string | null;
    },
  ) => {
    const response = await fetch(`/api/seating-plans/${planId}/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        sex: payload.sex,
        ageCategory: payload.ageCategory,
        groupId: payload.groupId,
        notes: payload.notes || null,
        ...(payload.plannedTableId !== undefined
          ? { plannedTableId: payload.plannedTableId }
          : {}),
      }),
    });
    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorData?.error ?? "Failed to update guest");
    }
    const data = (await response.json()) as { guest: ApiGuest };
    setGuests((current) => current.map((guest) => (guest.id === guestId ? data.guest : guest)));
    shouldAutosaveGuestsRef.current = true;
    scheduleAutosave();
  }, [planId, scheduleAutosave]);

  const handleUpdateGuestGroup = useCallback(
    async (guestId: string, groupId: string | null) => {
      const guest = guests.find((item) => item.id === guestId);
      if (!guest) {
        throw new Error("Guest not found");
      }

      const previousGroupId = guest.groupId;
      const previousGroup = guest.group;
      const nextGroup = groupId ? groups.find((item) => item.id === groupId) ?? null : null;

      setGuests((current) =>
        current.map((item) =>
          item.id === guestId
            ? {
                ...item,
                groupId,
                group: nextGroup
                  ? {
                      id: nextGroup.id,
                      name: nextGroup.name,
                      color: nextGroup.color,
                    }
                  : null,
              }
            : item,
        ),
      );

      if (selectedGuestId === guestId) {
        setGuestForm((current) => ({ ...current, groupId }));
      }

      try {
        await handleUpdateGuest(guestId, {
          name: guest.name,
          sex: guest.sex,
          ageCategory: guest.ageCategory,
          groupId,
          notes: guest.notes ?? "",
        });
      } catch (error) {
        setGuests((current) =>
          current.map((item) =>
            item.id === guestId
              ? {
                  ...item,
                  groupId: previousGroupId,
                  group: previousGroup,
                }
              : item,
          ),
        );

        if (selectedGuestId === guestId) {
          setGuestForm((current) => ({ ...current, groupId: previousGroupId }));
        }

        throw error;
      }
    },
    [groups, guests, handleUpdateGuest, selectedGuestId],
  );

  const handlePlanGuestsToTable = useCallback(
    async (tableId: string, guestIds: string[]) => {
      const uniqueGuestIds = Array.from(new Set(guestIds));
      const guestsToPlan = uniqueGuestIds
        .map((guestId) => guests.find((item) => item.id === guestId))
        .filter((guest): guest is ApiGuest => guest !== undefined);
      if (guestsToPlan.length === 0) {
        throw new Error("Guest not found");
      }

      const guestIdSet = new Set(guestsToPlan.map((guest) => guest.id));
      const previousPlannedTableByGuestId = Object.fromEntries(
        guestsToPlan.map((guest) => [guest.id, guest.plannedTableId]),
      ) as Record<string, string | null>;

      setGuests((current) =>
        current.map((item) =>
          guestIdSet.has(item.id) ? { ...item, plannedTableId: tableId } : item,
        ),
      );

      try {
        await Promise.all(
          guestsToPlan.map((guest) =>
            handleUpdateGuest(guest.id, {
              name: guest.name,
              sex: guest.sex,
              ageCategory: guest.ageCategory,
              groupId: guest.groupId,
              notes: guest.notes ?? "",
              plannedTableId: tableId,
            }),
          ),
        );
      } catch (error) {
        setGuests((current) =>
          current.map((item) =>
            guestIdSet.has(item.id)
              ? {
                  ...item,
                  plannedTableId: previousPlannedTableByGuestId[item.id] ?? null,
                }
              : item,
          ),
        );
        throw error;
      }
    },
    [guests, handleUpdateGuest],
  );

  const dropGuestOnTable = useCallback(
    async (tableId: string, guestId: string) => {
      if (!isDesktopViewport) return;
      if (isTableDraggingRef.current) return;
      const dragSession = dragSessionRef.current;
      endGuestDrag(dragSession);
      try {
        const moveTogetherRelationships = getAutoMoveTogetherRelationships(
          guestId,
          relationshipsByGuestId,
        );
        const guestIdsToPlan = new Set<string>([guestId]);
        for (const relationship of moveTogetherRelationships) {
          for (const relationshipGuestId of relationship.guestIds) {
            guestIdsToPlan.add(relationshipGuestId);
          }
        }

        await handlePlanGuestsToTable(tableId, Array.from(guestIdsToPlan));
        toast({
          variant: "success",
          title: t("toasts.success"),
          description:
            guestIdsToPlan.size > 1
              ? t("canvas.plannedTableAssignedGroup", {
                  count: guestIdsToPlan.size,
                })
              : t("canvas.plannedTableAssigned"),
        });
        handleSelectGuest(guestId);
      } catch (error) {
        setGuestsError(error instanceof Error ? error.message : t("canvas.failedPlanAssign"));
      }
    },
    [
      endGuestDrag,
      handlePlanGuestsToTable,
      handleSelectGuest,
      isDesktopViewport,
      relationshipsByGuestId,
      t,
    ],
  );

  const handleAutoSeatTable = useCallback(
    async (tableId: string) => {
      const response = await fetch(
        `/api/seating-plans/${planId}/tables/${tableId}/auto-seat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error ?? "Failed to auto-seat table");
      }
      const data = (await response.json()) as {
        assignmentsCreated: Array<{
          id: string;
          planId: string;
          tableId: string;
          guestId: string;
          seatNumber: number;
        }>;
        warnings: string[];
        guests: ApiGuest[];
      };

      if (data.guests.length > 0) {
        const guestsById = Object.fromEntries(data.guests.map((guest) => [guest.id, guest]));
        setGuests((current) =>
          current.map((guest) => guestsById[guest.id] ?? guest),
        );
      }

      if (data.assignmentsCreated.length > 0) {
        toast({
          variant: "success",
          title: t("toasts.success"),
          description: t("inspector.autoSeatSuccess", {
            count: data.assignmentsCreated.length,
          }),
        });
      } else {
        toast({
          variant: "info",
          title: t("toasts.info"),
          description: t("inspector.autoSeatNoChanges"),
        });
      }

      for (const warning of data.warnings) {
        toast({
          variant: "info",
          title: t("toasts.info"),
          description: warning,
        });
      }
    },
    [planId, t],
  );

  const handleDeleteGuest = useCallback(async (guestId: string) => {
    try {
      setGuestsError(null);
      const response = await fetch(`/api/seating-plans/${planId}/guests/${guestId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error ?? "Failed to delete guest");
      }
      setGuests((current) => current.filter((guest) => guest.id !== guestId));
      setRelationships((current) =>
        current
          .map((relationship) => ({
            ...relationship,
            guestIds: relationship.guestIds.filter((id) => id !== guestId),
            members: relationship.members.filter((member) => member.guestId !== guestId),
          }))
          .filter((relationship) => relationship.guestIds.length >= 2),
      );
      if (selectedGuestId === guestId) clearSelection();
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to delete guest");
    }
  }, [clearSelection, planId, scheduleAutosave, selectedGuestId]);

  const handleAddPlusOne = useCallback(
    async (guestId: string, placeholderName: string) => {
      try {
        setGuestsError(null);
        setRelationshipsError(null);
        const response = await fetch(
          `/api/seating-plans/${planId}/guests/${guestId}/plus-one`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ placeholderName }),
          },
        );
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to add plus one");
        }
        const data = (await response.json()) as {
          plusOneGuest: ApiGuest;
          relationship: ApiRelationship;
        };
        setGuests((current) => [...current, data.plusOneGuest]);
        setRelationships((current) => [...current, data.relationship]);
        shouldAutosaveGuestsRef.current = true;
        scheduleAutosave();
      } catch (error) {
        setGuestsError(error instanceof Error ? error.message : "Failed to add plus one");
      }
    },
    [planId, scheduleAutosave],
  );

  const handleRemovePlusOne = useCallback(
    async (guestId: string) => {
      try {
        setGuestsError(null);
        setRelationshipsError(null);
        const response = await fetch(
          `/api/seating-plans/${planId}/guests/${guestId}/plus-one`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to remove plus one");
        }
        const data = (await response.json()) as {
          success: boolean;
          relationshipId: string;
          deletedPlaceholderGuestId: string | null;
        };
        setRelationships((current) =>
          current.filter((relationship) => relationship.id !== data.relationshipId),
        );
        if (data.deletedPlaceholderGuestId) {
          setGuests((current) =>
            current.filter((guest) => guest.id !== data.deletedPlaceholderGuestId),
          );
          if (selectedGuestId === data.deletedPlaceholderGuestId) {
            clearSelection();
          }
        }
        shouldAutosaveGuestsRef.current = true;
        scheduleAutosave();
      } catch (error) {
        setGuestsError(
          error instanceof Error ? error.message : "Failed to remove plus one",
        );
      }
    },
    [clearSelection, planId, scheduleAutosave, selectedGuestId],
  );

  const handleCreateRelationship = useCallback(
    async (payload: {
      type: RelationshipType;
      name: string;
      preferredSeating: PreferredSeating;
      moveTogetherDefault: boolean;
      strict: boolean;
      guestIds: string[];
    }) => {
      try {
        setRelationshipsError(null);
        const response = await fetch(`/api/seating-plans/${planId}/relationships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to create relationship");
        }
        const data = (await response.json()) as { relationship: ApiRelationship };
        setRelationships((current) => [...current, data.relationship]);
      } catch (error) {
        setRelationshipsError(
          error instanceof Error ? error.message : "Failed to create relationship",
        );
      }
    },
    [planId],
  );

  const handleUpdateRelationship = useCallback(
    async (
      relationshipId: string,
      payload: Partial<{
        type: RelationshipType;
        name: string | null;
        preferredSeating: PreferredSeating;
        moveTogetherDefault: boolean;
        strict: boolean;
      }>,
    ) => {
      try {
        setRelationshipsError(null);
        const response = await fetch(
          `/api/seating-plans/${planId}/relationships/${relationshipId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to update relationship");
        }
        const data = (await response.json()) as { relationship: ApiRelationship };
        setRelationships((current) =>
          current.map((relationship) =>
            relationship.id === relationshipId ? data.relationship : relationship,
          ),
        );
      } catch (error) {
        setRelationshipsError(
          error instanceof Error ? error.message : "Failed to update relationship",
        );
      }
    },
    [planId],
  );

  const handleDeleteRelationship = useCallback(
    async (relationshipId: string) => {
      try {
        setRelationshipsError(null);
        const response = await fetch(
          `/api/seating-plans/${planId}/relationships/${relationshipId}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to delete relationship");
        }
        setRelationships((current) =>
          current.filter((relationship) => relationship.id !== relationshipId),
        );
      } catch (error) {
        setRelationshipsError(
          error instanceof Error ? error.message : "Failed to delete relationship",
        );
      }
    },
    [planId],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isDirty) return;
    // Debounce should follow the latest edit, not the first dirty transition.
    scheduleAutosave();
  }, [isDirty, isLoading, plan, scheduleAutosave]);

  useEffect(() => {
    if (isTableDragging) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }
    if (pendingAutosaveRef.current && (isDirtyRef.current || shouldAutosaveGuestsRef.current)) {
      pendingAutosaveRef.current = false;
      scheduleAutosave();
    }
  }, [isTableDragging, scheduleAutosave]);

  useEffect(() => {
    if (isDraggingGuest) return;
    if (!pendingBackgroundRefreshRef.current) return;
    pendingBackgroundRefreshRef.current = false;
    void Promise.all([
      loadGuests({ showLoading: false, surfaceErrors: false }),
      loadRelationships({ surfaceErrors: false }),
    ]);
  }, [isDraggingGuest, loadGuests, loadRelationships]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (isDirtyRef.current || shouldAutosaveGuestsRef.current) {
        void savePlanRef.current("auto");
      }
    };
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <p className="text-sm text-zinc-600">{t("editor.loadingPlan")}</p>
      </main>
    );
  }

  if (loadError) {
    const primaryButtonByKind: Record<PlanAccessError["kind"], { label: string; onClick: () => void }> = {
      unauthenticated: {
        label: t("seatingAccess.actions.signIn"),
        onClick: () => router.push(`/sign-in?next=${encodeURIComponent(`/seating-plans/${planId}`)}`),
      },
      forbidden: {
        label: t("seatingAccess.actions.goWeddings"),
        onClick: () => router.push("/weddings"),
      },
      notFound: {
        label: t("seatingAccess.actions.goPlans"),
        onClick: () => router.push("/seating-plans"),
      },
      generic: {
        label: t("seatingAccess.actions.retry"),
        onClick: () => window.location.reload(),
      },
    };

    const secondaryButtonByKind: Record<PlanAccessError["kind"], { label: string; onClick: () => void }> = {
      unauthenticated: {
        label: t("seatingAccess.actions.goHome"),
        onClick: () => router.push("/"),
      },
      forbidden: {
        label: t("seatingAccess.actions.goPlans"),
        onClick: () => router.push("/seating-plans"),
      },
      notFound: {
        label: t("seatingAccess.actions.goHome"),
        onClick: () => router.push("/"),
      },
      generic: {
        label: t("seatingAccess.actions.goPlans"),
        onClick: () => router.push("/seating-plans"),
      },
    };

    const iconByKind: Record<PlanAccessError["kind"], ReactNode> = {
      unauthenticated: <LockKeyhole className="size-5 text-amber-600" />,
      forbidden: <ShieldAlert className="size-5 text-amber-600" />,
      notFound: <Link2Off className="size-5 text-zinc-600" />,
      generic: <AlertTriangle className="size-5 text-red-600" />,
    };

    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-zinc-100">
            {iconByKind[loadError.kind]}
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {t(`seatingAccess.${loadError.kind}.title`)}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {t(`seatingAccess.${loadError.kind}.description`)}
          </p>
          {loadError.message ? (
            <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              {loadError.message}
            </p>
          ) : null}
          {loadError.kind === "forbidden" ? (
            <p className="mt-3 text-xs text-zinc-500">{t("seatingAccess.forbidden.help")}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={primaryButtonByKind[loadError.kind].onClick}>
              {primaryButtonByKind[loadError.kind].label}
            </Button>
            <Button
              variant="outline"
              onClick={secondaryButtonByKind[loadError.kind].onClick}
            >
              {secondaryButtonByKind[loadError.kind].label}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (!canEdit) {
    return (
      <main className="bg-zinc-50">
        <div className={`${isDesktopViewport ? "min-h-dvh lg:h-dvh" : "h-dvh"} flex flex-col overflow-hidden`}>
          <SeatingToolbar
            backHref={backHref}
            planName={plan.name}
            isDirty={false}
            saveState="idle"
            lastSavedLabel={null}
            onPlanNameChange={() => {}}
            onSave={() => {}}
            readOnly
            viewingAsLabel={viewingAsLabel}
            anonIdentity={anonIdentity}
          />
          <div className="relative min-h-0 flex-1 overflow-hidden border-t border-zinc-200 bg-zinc-100/40">
            <SeatingCanvas
              plan={plan}
              selectedTableId={canvasHighlightedTableId ?? undefined}
              selectedSeat={selectedSeat}
              onSelectSeat={selectSeat}
              seatAssignments={seatAssignments}
              tableLabelById={tableLabelById}
              selectedGuestId={selectedGuestId}
              guests={guests.map((guest) => ({
                id: guest.id,
                name: guest.name,
                sex: guest.sex,
                plannedTableId: guest.plannedTableId,
                plusOneHostGuestId: guest.plusOneHostGuestId,
                group: guest.group,
                assignment: guest.assignment
                  ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
                  : null,
              }))}
              showGroupColors={showGroupColors}
              onToggleGroupColors={() => setShowGroupColors((current) => !current)}
              enableTableDrag={false}
              enableSeatDrag={false}
              pairSidePreference={
                plan.pairSidePreference === "auto" ? undefined : plan.pairSidePreference
              }
              relationshipsByGuestId={relationshipsByGuestId}
              remoteCursors={remoteCursors}
              onPointerPresenceChange={handlePointerPresenceChange}
              mobileMode={!isDesktopViewport}
              readOnly
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-zinc-50">
      {!isDesktopViewport ? (
      <div className="flex h-dvh flex-col overflow-hidden">
        <SeatingToolbar
          backHref={backHref}
          planName={plan.name}
          isDirty={isDirty}
          saveState={saveState}
          lastSavedLabel={lastSavedLabel}
          onPlanNameChange={updatePlanName}
          onSave={handleSave}
          onOpenPlanSettings={() => setMobileMoreView("settings")}
          viewingAsLabel={viewingAsLabel}
          anonIdentity={anonIdentity}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden border-t border-zinc-200 bg-zinc-100/40">
          <SeatingCanvas
            plan={plan}
            selectedTableId={canvasHighlightedTableId ?? undefined}
            selectedSeat={selectedSeat}
            onSelectTable={handleSelectTableWithMobileInspector}
            onSelectSeat={handleSelectSeatWithMobileInspector}
            onMoveTable={handleMoveTable}
            seatAssignments={seatAssignments}
            tableLabelById={tableLabelById}
            selectedGuestId={selectedGuestId}
            guests={guests.map((guest) => ({
              id: guest.id,
              name: guest.name,
              sex: guest.sex,
              plannedTableId: guest.plannedTableId,
              plusOneHostGuestId: guest.plusOneHostGuestId,
              group: guest.group,
              assignment: guest.assignment
                ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
                : null,
            }))}
            showGroupColors={showGroupColors}
            onSeatAssign={handleSeatAssign}
            onTableDragStateChange={setIsTableDragging}
            onAddTable={handleAddTable}
            enableTableDrag={mobileTableDragEnabled}
            onToggleGroupColors={() => setShowGroupColors((current) => !current)}
            onToggleTableDrag={() =>
              setMobileTableDragEnabled((current) => !current)
            }
            pairSidePreference={
              plan.pairSidePreference === "auto" ? undefined : plan.pairSidePreference
            }
            relationshipsByGuestId={relationshipsByGuestId}
            remoteCursors={remoteCursors}
            onPointerPresenceChange={handlePointerPresenceChange}
            mobileMode
          />
          <Button
            type="button"
            className="absolute bottom-4 right-4 z-30 h-12 w-12 rounded-full p-0 text-lg font-semibold shadow-md"
            aria-label={t("editor.addRectTable")}
            onClick={() => setMobileTablesOpen(true)}
          >
            +
          </Button>
        </div>
        <div className="shrink-0 border-t border-zinc-200 bg-white px-2 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={mobileGuestsOpen ? "default" : "outline"}
              className="h-12 flex-col items-center justify-center gap-0.5 text-[11px]"
              onClick={() => {
                setMobileGuestsOpen(true);
                setMobileGuestsView("guests");
                setMobileTablesOpen(false);
                setMobileMoreOpen(false);
                setMobileInspectorOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
              {t("editor.guests")}
            </Button>
            <Button
              size="sm"
              variant={mobileMoreOpen ? "default" : "outline"}
              className="h-12 flex-col items-center justify-center gap-0.5 text-[11px]"
              onClick={() => {
                setMobileGuestsOpen(false);
                setMobileMoreOpen(true);
                setMobileInspectorOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <circle cx="6" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="18" cy="12" r="1.6" />
              </svg>
              {t("editor.more")}
            </Button>
          </div>
        </div>

        <Drawer open={mobileGuestsOpen} onOpenChange={setMobileGuestsOpen}>
          <DrawerContent className="flex h-[85dvh] flex-col p-0">
            <DrawerTitle className="sr-only">{t("editor.guests")}</DrawerTitle>
            <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={mobileGuestsView === "guests" ? "default" : "outline"}
                  onClick={() => setMobileGuestsView("guests")}
                >
                  {t("editor.guests")}
                </Button>
                <Button
                  size="sm"
                  variant={mobileGuestsView === "groups" ? "default" : "outline"}
                  onClick={() => {
                    setMobileGuestsView("groups");
                    setMobileAddGuestOpen(false);
                    setMobileAddGuestError(null);
                  }}
                >
                  {t("guestPanel.groupsTitle")}
                </Button>
              </div>
            </div>
            {mobileGuestsView === "guests" ? (
              <>
                <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">{t("editor.guests")}</h3>
                      <p className="text-xs text-zinc-500">
                        {guests.length} {t("guestPanel.guestCountLabel")} · {unseatedGuestCount}{" "}
                        {t("guestPanel.unseatedCountLabel")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => {
                          setMobileAddGuestOpen((current) => !current);
                          setMobileAddGuestError(null);
                        }}
                        aria-label={t("guestPanel.addGuest")}
                      >
                        +
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setMobileGuestsOpen(false);
                          setMobileMoreOpen(true);
                        }}
                        aria-label={t("editor.more")}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <circle cx="6" cy="12" r="1.6" />
                          <circle cx="12" cy="12" r="1.6" />
                          <circle cx="18" cy="12" r="1.6" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  {mobileAddGuestOpen ? (
                    <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
                      <Input
                        value={mobileNewGuestName}
                        onChange={(event) => setMobileNewGuestName(event.target.value)}
                        placeholder={t("guestPanel.addGuestPlaceholder")}
                      />
                      {mobileAddGuestError ? (
                        <p className="text-xs text-red-700">{mobileAddGuestError}</p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={mobileAddGuestSubmitting}
                          onClick={() => void handleCreateGuestFromMobileSheet()}
                        >
                          {t("common.save")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMobileAddGuestOpen(false);
                            setMobileAddGuestError(null);
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <GuestPanel
                  variant="sheet"
                  showHeader={false}
                  showQuickAdd={false}
                  guests={guests}
                  groups={groups}
                  relationships={relationships}
                  tableLabelById={tableLabelById}
                  selectedGuestId={selectedGuestId}
                  isLoading={isGuestsLoading}
                  error={guestsError ?? groupsError ?? relationshipsError}
                  onSelectGuest={handleSelectGuest}
                  onCreateGuest={handleCreateGuest}
                  onCreateRelationship={handleCreateRelationship}
                  linkingSourceGuestId={linkingSourceGuestId}
                  onLinkingSourceApplied={handleLinkingSourceApplied}
                  onGuestSelected={(guestId) => {
                    if (!guestId) return;
                    setMobileGuestsOpen(false);
                    setMobileInspectorOpen(true);
                  }}
                />
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("guestPanel.groupsTitle")}</h3>
                  <p className="text-xs text-zinc-500">{groups.length} {t("guestPanel.groupsTitle").toLowerCase()}</p>
                </div>
                <div className="px-4 py-4">
                  <GroupsManager
                    guests={guests}
                    groups={groups}
                    onCreateGroup={handleCreateGroup}
                    onUpdateGroup={handleUpdateGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onUpdateGuestGroup={handleUpdateGuestGroup}
                  />
                </div>
              </div>
            )}
          </DrawerContent>
        </Drawer>

        <Drawer open={mobileTablesOpen} onOpenChange={setMobileTablesOpen}>
          <DrawerContent className="p-4">
            <DrawerTitle className="sr-only">{t("editor.tablesObjects")}</DrawerTitle>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">{t("editor.tablesObjects")}</h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={() => {
                  handleAddTable();
                  setMobileTablesOpen(false);
                }}
              >
                {t("editor.addRectTable")}
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                {t("editor.roundComing")}
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                {t("editor.buffetComing")}
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                {t("editor.danceComing")}
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                {t("editor.customComing")}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
        <Drawer
          open={mobileMoreOpen}
          onOpenChange={(open) => {
            setMobileMoreOpen(open);
            if (!open) {
              setMobileMoreView("menu");
            }
          }}
        >
          <DrawerContent className="p-0">
            <DrawerTitle className="sr-only">
              {mobileMoreView === "menu"
                ? t("editor.more")
                : mobileMoreView === "legend"
                  ? t("canvas.legendTitle")
                  : mobileMoreView === "settings"
                    ? t("planSettings.title")
                    : t("editor.importExport")}
            </DrawerTitle>
            {mobileMoreView === "menu" ? (
              <>
                <div className="px-4 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("editor.more")}</h3>
                </div>
                <div className="border-t border-zinc-200 px-2 py-2">
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-between px-3 text-sm"
                    onClick={() => setMobileMoreView("data")}
                  >
                    <span>{t("editor.importExport")}</span>
                    <span className="text-zinc-400">›</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-between px-3 text-sm"
                    onClick={() => setMobileMoreView("settings")}
                  >
                    <span>{t("editor.settings")}</span>
                    <span className="text-zinc-400">›</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-between px-3 text-sm"
                    onClick={() => setMobileMoreView("legend")}
                  >
                    <span>{t("editor.legend")}</span>
                    <span className="text-zinc-400">›</span>
                  </Button>
                  <div className="flex h-11 items-center justify-between px-3 text-sm">
                    <span>{t("canvas.groupColorsMode")}</span>
                    <Switch
                      checked={showGroupColors}
                      onCheckedChange={setShowGroupColors}
                      aria-label={t("canvas.groupColorsMode")}
                    />
                  </div>
                  <Button variant="ghost" className="h-11 w-full justify-between px-3 text-sm" disabled>
                    <span>{t("editor.share")}</span>
                    <span className="rounded-full border border-blue-200 px-2 py-0.5 text-[10px] text-blue-600">
                      {t("editor.customComing")}
                    </span>
                  </Button>
                  <Button variant="ghost" className="h-11 w-full justify-between px-3 text-sm" disabled>
                    <span>{t("editor.help")}</span>
                    <span className="rounded-full border border-blue-200 px-2 py-0.5 text-[10px] text-blue-600">
                      {t("editor.customComing")}
                    </span>
                  </Button>
                </div>
                <div className="border-t border-zinc-200 p-3">
                  <Button
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() => setMobileMoreOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </>
            ) : mobileMoreView === "legend" ? (
              <>
                <div className="px-4 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("canvas.legendTitle")}</h3>
                </div>
                <div className="space-y-4 border-t border-zinc-200 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-block h-8 w-8 rounded-full border"
                      style={{
                        backgroundColor: showGroupColors ? "#2563EB" : "transparent",
                        borderColor: showGroupColors ? "#1D4ED8" : "#D4D4D8",
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {t("canvas.groupColorsMode")}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {showGroupColors ? t("guestPanel.on") : t("guestPanel.off")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500 bg-emerald-100 text-xs font-semibold text-emerald-900">AM</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{t("editor.selectedGuest")}</p>
                      <p className="text-xs text-zinc-500">{t("editor.selectedInPlan")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-block h-8 w-8 rounded-full border border-blue-500 bg-blue-200" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{t("editor.occupied")}</p>
                      <p className="text-xs text-zinc-500">{t("editor.seatAssigned")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-block h-8 w-8 rounded-full border border-zinc-300 bg-white" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{t("editor.empty")}</p>
                      <p className="text-xs text-zinc-500">{t("editor.seatAvailable")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-block h-8 w-8 rounded-full border border-red-400 bg-red-100" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{t("editor.conflict")}</p>
                      <p className="text-xs text-zinc-500">{t("editor.duplicateInvalid")}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-200 p-3">
                  <Button
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() => setMobileMoreView("menu")}
                  >
                    {t("common.close")}
                  </Button>
                </div>
              </>
            ) : mobileMoreView === "settings" ? (
              <>
                <div className="px-4 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("planSettings.title")}</h3>
                </div>
                <div className="space-y-3 border-t border-zinc-200 px-4 py-4">
                  <div className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-zinc-700">
                          {t("planSettings.publicRead")}
                        </p>
                        <p className="text-xs text-zinc-500">{t("planSettings.publicReadHelp")}</p>
                      </div>
                      <Switch
                        checked={isPublicRead}
                        onCheckedChange={(checked) => {
                          void handleTogglePublicRead(checked);
                        }}
                        disabled={isUpdatingSharing}
                        aria-label={t("planSettings.publicRead")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-600">
                      {t("planSettings.pairSidePreference")}
                    </p>
                    <Select
                      value={plan.pairSidePreference}
                      onValueChange={(value) =>
                        updatePlanPairSidePreference(
                          value as "auto" | "male-left" | "female-left",
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{t("planSettings.pairSideAuto")}</SelectItem>
                        <SelectItem value="male-left">{t("planSettings.pairSideMaleLeft")}</SelectItem>
                        <SelectItem value="female-left">{t("planSettings.pairSideFemaleLeft")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-zinc-500">{t("planSettings.pairSideHelp")}</p>
                  </div>
                </div>
                <div className="border-t border-zinc-200 p-3">
                  <Button
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() => setMobileMoreView("menu")}
                  >
                    {t("common.close")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("editor.importExport")}</h3>
                </div>
                <div className="max-h-[62dvh] overflow-auto border-t border-zinc-200 px-4 py-4">
                  <GuestDataTools
                    guests={guests}
                    onBulkImportGuests={handleBulkImportGuests}
                    compact
                  />
                </div>
                <div className="border-t border-zinc-200 p-3">
                  <Button
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() => setMobileMoreView("menu")}
                  >
                    {t("common.close")}
                  </Button>
                </div>
              </>
            )}
          </DrawerContent>
        </Drawer>

        <InspectorPanel
          selection={selection}
          isOpen={mobileInspectorOpen}
          selectedGuest={selectedGuest}
          guests={guests}
          groups={groups}
          relationships={relationships}
          guestForm={guestForm}
          selectedTable={selectedTable}
          selectedSeatGuest={selectedSeatGuest}
          tableLabelById={tableLabelById}
          onClose={() => setMobileInspectorOpen(false)}
          onBackToGuestList={() => {
            handleSelectGuest(null);
            setMobileInspectorOpen(false);
            setMobileGuestsView("guests");
            setMobileGuestsOpen(true);
          }}
          onSelectTable={(tableId) => selectTable(tableId)}
          onGuestFormChange={setGuestForm}
          onUpdateGuest={handleUpdateGuest}
          onCreateGroup={handleCreateGroup}
          onDeleteGuest={handleDeleteGuest}
          onUnassignGuest={handleUnassignGuest}
          onUpdateRelationship={handleUpdateRelationship}
          onDeleteRelationship={handleDeleteRelationship}
          onAddPlusOne={handleAddPlusOne}
          onRemovePlusOne={handleRemovePlusOne}
          onStartLinking={(guestId) => {
            setLinkingSourceGuestId(guestId);
            setMobileInspectorOpen(false);
            setMobileGuestsView("guests");
            setMobileGuestsOpen(true);
          }}
          onTableLabelChange={handleUpdateSelectedTableLabel}
          onTableSeatCountChange={handleUpdateSelectedTableSeatCount}
          onTableSeatLayoutChange={handleUpdateSelectedTableSeatLayout}
          onRotateTable={handleRotateSelectedTable}
          onDeleteTable={handleDeleteSelectedTable}
          onAutoSeatTable={handleAutoSeatTable}
          side="bottom"
          showOverlay
        />
      </div>
      ) : null}

      {isDesktopViewport ? (
      <div className="min-h-dvh flex-col lg:h-dvh flex">
        <SeatingToolbar
          backHref={backHref}
          planName={plan.name}
          isDirty={isDirty}
          saveState={saveState}
          lastSavedLabel={lastSavedLabel}
          onPlanNameChange={updatePlanName}
          onSave={handleSave}
          onOpenPlanSettings={() => setDesktopPlanSettingsOpen(true)}
          viewingAsLabel={viewingAsLabel}
          anonIdentity={anonIdentity}
        />
        <div className="flex min-h-0 flex-1 flex-row">
          <GuestPanel
            guests={guests}
            groups={groups}
            relationships={relationships}
            tableLabelById={tableLabelById}
            selectedGuestId={selectedGuestId}
            isLoading={isGuestsLoading}
            error={guestsError ?? groupsError ?? relationshipsError}
            onSelectGuest={handleSelectGuest}
            onCreateGuest={handleCreateGuest}
            onCreateRelationship={handleCreateRelationship}
            onOpenGroupsManager={() => setDesktopGroupsManagerOpen(true)}
            onOpenDataTools={() => setDesktopDataToolsOpen(true)}
            onExportGuests={handleExportGuestsCsv}
            onExportTableList={handleExportTableList}
            onExportPdf={() => setIsExportPdfDialogOpen(true)}
            onOpenLegend={handleOpenLegend}
            onOpenSettings={() => setDesktopPlanSettingsOpen(true)}
            linkingSourceGuestId={linkingSourceGuestId}
            onLinkingSourceApplied={handleLinkingSourceApplied}
            enableGuestDnD
            onGuestDragStart={startGuestDrag}
            onGuestDragEnd={endGuestDrag}
          />
          <div className="relative order-2 flex w-full bg-zinc-100/40 lg:h-auto lg:min-h-0 lg:flex-1 lg:border-t-0">
            <SeatingCanvas
              plan={plan}
              selectedTableId={canvasHighlightedTableId ?? undefined}
              selectedSeat={selectedSeat}
              onSelectTable={selectTable}
              onSelectSeat={selectSeat}
              onMoveTable={handleMoveTable}
              seatAssignments={seatAssignments}
              tableLabelById={tableLabelById}
              selectedGuestId={selectedGuestId}
              guests={guests.map((guest) => ({
                id: guest.id,
                name: guest.name,
                sex: guest.sex,
                plannedTableId: guest.plannedTableId,
                plusOneHostGuestId: guest.plusOneHostGuestId,
                group: guest.group,
                assignment: guest.assignment
                  ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
                  : null,
              }))}
              showGroupColors={showGroupColors}
              onSeatAssign={handleSeatAssign}
              onTableDragStateChange={setIsTableDragging}
              onAddTable={handleAddTable}
              enableTableDrag
              onToggleGroupColors={() => setShowGroupColors((current) => !current)}
              draggedGuestId={draggedGuestId}
              isDraggingGuest={isDraggingGuest}
              enableSeatDrag={isDesktopViewport}
              onSeatGuestDragStart={startGuestDrag}
              onSeatGuestDragEnd={endGuestDrag}
              onGuestDropToSeat={dropGuestOnSeat}
              onGuestDropToTable={dropGuestOnTable}
              pairSidePreference={
                plan.pairSidePreference === "auto" ? undefined : plan.pairSidePreference
              }
              relationshipsByGuestId={relationshipsByGuestId}
              remoteCursors={remoteCursors}
              onPointerPresenceChange={handlePointerPresenceChange}
            />
            <InspectorPanel
              selection={desktopInspectorSelection}
              isOpen={desktopInspectorSelection !== null}
              selectedGuest={selectedGuest}
              guests={guests}
              groups={groups}
              relationships={relationships}
              guestForm={guestForm}
              selectedTable={selectedTable}
              selectedSeatGuest={selectedSeatGuest}
              tableLabelById={tableLabelById}
              onClose={clearSelection}
              onSelectTable={(tableId) => selectTable(tableId)}
              onGuestFormChange={setGuestForm}
              onUpdateGuest={handleUpdateGuest}
              onCreateGroup={handleCreateGroup}
              onDeleteGuest={handleDeleteGuest}
              onUnassignGuest={handleUnassignGuest}
              onUpdateRelationship={handleUpdateRelationship}
              onDeleteRelationship={handleDeleteRelationship}
              onAddPlusOne={handleAddPlusOne}
              onRemovePlusOne={handleRemovePlusOne}
              onStartLinking={(guestId) => {
                setLinkingSourceGuestId(guestId);
              }}
              onTableLabelChange={handleUpdateSelectedTableLabel}
              onTableSeatCountChange={handleUpdateSelectedTableSeatCount}
              onTableSeatLayoutChange={handleUpdateSelectedTableSeatLayout}
              onRotateTable={handleRotateSelectedTable}
              onDeleteTable={handleDeleteSelectedTable}
              onAutoSeatTable={handleAutoSeatTable}
            />
          </div>
        </div>
        <Sheet open={desktopGroupsManagerOpen} onOpenChange={setDesktopGroupsManagerOpen}>
          <SheetContent side="right" className="flex w-[420px] flex-col p-0 sm:max-w-[420px]">
            <SheetTitle className="px-4 py-4 text-left text-sm font-semibold text-zinc-900">
              {t("guestPanel.groupsTitle")}
            </SheetTitle>
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-200 px-4 py-4">
              <GroupsManager
                guests={guests}
                groups={groups}
                onCreateGroup={handleCreateGroup}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
                onUpdateGuestGroup={handleUpdateGuestGroup}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={desktopDataToolsOpen} onOpenChange={setDesktopDataToolsOpen}>
          <SheetContent side="right" className="flex w-[420px] flex-col p-0 sm:max-w-[420px]">
            <SheetTitle className="px-4 py-4 text-left text-sm font-semibold text-zinc-900">
              {t("editor.importExport")}
            </SheetTitle>
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-200 px-4 py-4">
              <GuestDataTools guests={guests} onBulkImportGuests={handleBulkImportGuests} />
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={desktopPlanSettingsOpen} onOpenChange={setDesktopPlanSettingsOpen}>
          <SheetContent side="right" className="flex w-[420px] flex-col p-0 sm:max-w-[420px]">
            <SheetTitle className="px-4 py-4 text-left text-sm font-semibold text-zinc-900">
              {t("planSettings.title")}
            </SheetTitle>
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-200 px-4 py-4">
              <div className="space-y-3">
                <div className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-zinc-700">
                        {t("planSettings.publicRead")}
                      </p>
                      <p className="text-xs text-zinc-500">{t("planSettings.publicReadHelp")}</p>
                    </div>
                    <Switch
                      checked={isPublicRead}
                      onCheckedChange={(checked) => {
                        void handleTogglePublicRead(checked);
                      }}
                      disabled={isUpdatingSharing}
                      aria-label={t("planSettings.publicRead")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-zinc-600">
                    {t("planSettings.pairSidePreference")}
                  </p>
                  <Select
                    value={plan.pairSidePreference}
                    onValueChange={(value) =>
                      updatePlanPairSidePreference(
                        value as "auto" | "male-left" | "female-left",
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t("planSettings.pairSideAuto")}</SelectItem>
                      <SelectItem value="male-left">{t("planSettings.pairSideMaleLeft")}</SelectItem>
                      <SelectItem value="female-left">{t("planSettings.pairSideFemaleLeft")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">{t("planSettings.pairSideHelp")}</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <ExportPdfDialog
          open={isExportPdfDialogOpen}
          onOpenChange={setIsExportPdfDialogOpen}
          onExport={async (options) => {
            try {
              await handleExportPdf(options);
              toast({
                title: t("exportPdf.successTitle"),
                description: t("exportPdf.successDescription"),
              });
            } catch (error) {
              toast({
                title: t("exportPdf.errorTitle"),
                description: error instanceof Error ? error.message : t("exportPdf.errorDescription"),
                variant: "destructive",
              });
            }
          }}
        />
      </div>
      ) : null}
    </main>
  );
}

export default function SeatingPlanEditorPage() {
  return <SeatingPlanEditorScreen />;
}

