"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Copy,
  Ellipsis,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { AppEmptyState } from "@/components/app/AppEmptyState";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDefaultCancel,
  AlertDialogDescription,
  AlertDialogDestructiveAction,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";
import { getWeddingRoutes } from "@/lib/routes";

type SeatingPlanSummary = {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: string;
  assignments: Array<{ id: string }>;
  guests: Array<{ id: string }>;
  event: { id: string; name: string } | null;
};

type WeddingSeatingPageProps = {
  embedded?: boolean;
  weddingId: string;
  canEdit: boolean;
  planMismatch?: boolean;
  events: Array<{
    id: string;
    name: string;
  }>;
  plans: SeatingPlanSummary[];
};

type PlanCardProps = {
  plan: SeatingPlanSummary;
  canEdit: boolean;
  dateFormatter: Intl.DateTimeFormat;
  href: string;
  isDuplicating: boolean;
  isDeleting: boolean;
  onDuplicate: (planId: string) => void;
  onDeleteRequest: (plan: SeatingPlanSummary) => void;
  onEditRequest: (plan: SeatingPlanSummary) => void;
  t: ReturnType<typeof useI18n>["t"];
};

function PlanCard({
  plan,
  canEdit,
  dateFormatter,
  href,
  isDuplicating,
  isDeleting,
  onDuplicate,
  onDeleteRequest,
  onEditRequest,
  t,
}: PlanCardProps) {
  const seatsTaken = plan.assignments.length;
  const seatCapacity = plan.guests.length;
  const completion = seatCapacity > 0 ? Math.round((seatsTaken / seatCapacity) * 100) : 0;
  const remainingSeats = Math.max(0, seatCapacity - seatsTaken);

  return (
    <article className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-colors hover:border-zinc-300 lg:grid-cols-[minmax(0,1fr)_150px_minmax(220px,300px)_240px_44px] lg:items-center lg:gap-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-zinc-950">{plan.name}</h2>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
            {plan.event?.name ?? t("events.detail.seatingTab.noEvent")}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-zinc-400" />
            {dateFormatter.format(new Date(plan.updatedAt))}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4 text-zinc-400" />
            {plan.event?.name ?? t("events.detail.seatingTab.noEvent")}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-50 px-4 py-3 lg:bg-transparent lg:px-0 lg:py-0">
        <p className="tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
          {seatsTaken} / {seatCapacity}
        </p>
        <p className="text-sm text-zinc-600">{t("events.detail.cards.seating.seated")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-700">{t("events.detail.seatingTab.columns.progress")}</span>
          <span className="text-sm font-semibold tabular-nums text-emerald-700">{completion}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-xs text-zinc-500">
          {remainingSeats > 0
            ? t("events.detail.seatingTab.remainingToSeat", { count: remainingSeats })
            : t("events.detail.seatingTab.complete")}
        </p>
      </div>

      <Link
        href={href}
        className="inline-flex h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-violet-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <span className="truncate">{t("events.detail.actions.openSeatingPlan")}</span>
        <ArrowUpRight className="size-4 shrink-0" />
      </Link>

      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
              aria-label={t("events.detail.seatingTab.moreActions")}
              disabled={isDeleting}
            >
              <Ellipsis className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => onEditRequest(plan)}
                disabled={!canEdit || isDuplicating || isDeleting}
              >
                <Pencil className="mr-2 size-4" />
                {t("events.detail.seatingTab.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDuplicate(plan.id)}
                disabled={!canEdit || isDuplicating || isDeleting}
              >
                <Copy className="mr-2 size-4" />
                {isDuplicating ? t("events.detail.seatingTab.duplicating") : t("events.detail.seatingTab.duplicate")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="text-red-700 focus:bg-red-50 focus:text-red-700"
                onSelect={() => onDeleteRequest(plan)}
                disabled={!canEdit || isDeleting}
              >
                <Trash2 className="mr-2 size-4" />
                {isDeleting ? t("events.detail.seatingTab.deleting") : t("events.detail.seatingTab.delete")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

export function WeddingSeatingPage({
  embedded = false,
  weddingId,
  canEdit,
  plans: initialPlans,
  events,
  planMismatch = false,
}: WeddingSeatingPageProps) {
  const { t, locale } = useI18n();
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const routes = getWeddingRoutes(weddingId);
  const [plans, setPlans] = useState(initialPlans);
  const [query, setQuery] = useState("");
  const [planName, setPlanName] = useState("");
  const [eventFilterId, setEventFilterId] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "name">("updated");
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [planDialogMode, setPlanDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingPlan, setEditingPlan] = useState<SeatingPlanSummary | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [duplicatingPlanId, setDuplicatingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SeatingPlanSummary | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedEventName = useMemo(
    () => events.find((event) => event.id === selectedEventId)?.name ?? null,
    [events, selectedEventId],
  );

  const visiblePlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = plans.filter((plan) => {
      if (eventFilterId !== "all" && plan.event?.id !== eventFilterId) return false;
      if (!normalizedQuery) return true;
      return plan.name.toLowerCase().includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, locale);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [eventFilterId, locale, plans, query, sortBy]);

  const totalSeated = plans.reduce((sum, plan) => sum + plan.assignments.length, 0);
  const totalCapacity = plans.reduce((sum, plan) => sum + plan.guests.length, 0);
  const averageCompletion = totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0;

  const handleCreatePlan = async () => {
    if (!canEdit || !selectedEventId || isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    const resolvedPlanName =
      planName.trim() || `${t("plans.newPlanPrefix")} ${dtf.format(new Date())}`;

    try {
      const response = await fetch("/api/seating-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resolvedPlanName,
          eventId: selectedEventId,
          width: 1600,
          height: 1000,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            plan?: {
              id: string;
              name: string;
              width: number;
              height: number;
              updatedAt?: string;
              assignments?: Array<{ id: string }>;
              guests?: Array<{ id: string }>;
            };
          }
        | null;

      if (!response.ok || !payload?.plan) {
        setCreateError(payload?.error ?? t("events.detail.states.createPlanError"));
        return;
      }

      setPlans((current) => [
        {
          id: payload.plan!.id,
          name: payload.plan!.name,
          width: payload.plan!.width,
          height: payload.plan!.height,
          updatedAt: payload.plan!.updatedAt ?? new Date().toISOString(),
          assignments: payload.plan!.assignments ?? [],
          guests: payload.plan!.guests ?? [],
          event: selectedEventName ? { id: selectedEventId, name: selectedEventName } : null,
        },
        ...current,
      ]);
      setPlanName("");
      setPlanDialogMode(null);
    } catch {
      setCreateError(t("events.detail.states.createPlanError"));
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateDialog = () => {
    setCreateError(null);
    setEditingPlan(null);
    setPlanName("");
    if (!selectedEventId && events[0]) setSelectedEventId(events[0].id);
    setPlanDialogMode("create");
  };

  const openEditDialog = (plan: SeatingPlanSummary) => {
    setCreateError(null);
    setEditingPlan(plan);
    setPlanName(plan.name);
    setSelectedEventId(plan.event?.id ?? events[0]?.id ?? "");
    setPlanDialogMode("edit");
  };

  const closePlanDialog = () => {
    if (isCreating || isUpdating) return;
    setPlanDialogMode(null);
    setEditingPlan(null);
    setCreateError(null);
    setPlanName("");
  };

  const handleUpdatePlan = async () => {
    if (!canEdit || !editingPlan || !selectedEventId || isUpdating) return;

    const resolvedPlanName = planName.trim();
    if (!resolvedPlanName) return;

    setIsUpdating(true);
    setCreateError(null);

    try {
      const response = await fetch(`/api/seating-plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resolvedPlanName,
          eventId: selectedEventId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            plan?: SeatingPlanSummary;
          }
        | null;

      if (!response.ok || !payload?.plan) {
        setCreateError(payload?.error ?? t("events.detail.seatingTab.updateError"));
        return;
      }

      setPlans((current) =>
        current.map((plan) =>
          plan.id === payload.plan!.id
            ? {
                ...plan,
                name: payload.plan!.name,
                updatedAt: payload.plan!.updatedAt,
                event: payload.plan!.event,
              }
            : plan,
        ),
      );
      setPlanDialogMode(null);
      setEditingPlan(null);
      setPlanName("");
    } catch {
      setCreateError(t("events.detail.seatingTab.updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicatePlan = async (sourcePlanId: string) => {
    if (!canEdit || duplicatingPlanId || isCreating || isUpdating || deletingPlanId) return;

    setDuplicateError(null);
    setDuplicatingPlanId(sourcePlanId);

    try {
      const response = await fetch(`/api/seating-plans/${sourcePlanId}/duplicate`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            plan?: SeatingPlanSummary;
          }
        | null;

      if (!response.ok || !payload?.plan) {
        setDuplicateError(payload?.error ?? t("events.detail.seatingTab.duplicateError"));
        return;
      }

      setPlans((current) => [payload.plan!, ...current]);
    } catch {
      setDuplicateError(t("events.detail.seatingTab.duplicateError"));
    } finally {
      setDuplicatingPlanId(null);
    }
  };

  const handleDeletePlan = async () => {
    if (!canEdit || !deleteCandidate || deletingPlanId) return;

    setDeleteError(null);
    setDeletingPlanId(deleteCandidate.id);

    try {
      const response = await fetch(`/api/seating-plans/${deleteCandidate.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setDeleteError(payload?.error ?? t("events.detail.seatingTab.deleteError"));
        return;
      }

      setPlans((current) => current.filter((plan) => plan.id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch {
      setDeleteError(t("events.detail.seatingTab.deleteError"));
    } finally {
      setDeletingPlanId(null);
    }
  };

  const isSavingPlan = isCreating || isUpdating;
  const isEditingPlan = planDialogMode === "edit";
  const canCreatePlan = canEdit && !isSavingPlan && !!selectedEventId;
  const canUpdatePlan = canEdit && !isSavingPlan && !!editingPlan && !!selectedEventId && !!planName.trim();
  const canOpenCreateDialog = canEdit && events.length > 0;

  return (
    <AppWorkspacePage as={embedded ? "div" : "main"} className={embedded ? "contents" : "gap-5"}>
      {!embedded ? <WeddingPageHeader
        title={t("dashboard.sidebar.nav.seating")}
        subtitle={t("events.detail.seatingTab.description")}
      /> : null}

      {planMismatch ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{t("seating.mismatch")}</span>
        </div>
      ) : null}

      <AppStatsRail
        items={[
          { label: t("events.detail.seatingTab.summary.plans"), value: plans.length },
          { label: t("events.detail.seatingTab.summary.seated"), value: `${totalSeated} / ${totalCapacity}` },
          { label: t("events.detail.seatingTab.summary.progress"), value: `${averageCompletion}%` },
        ]}
      />

      <section>
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="h-10 border-zinc-300 bg-white pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("events.detail.seatingTab.searchPlaceholder")}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            className="h-10"
            onClick={openCreateDialog}
            disabled={!canOpenCreateDialog}
          >
            <Plus className="size-4" />
            {t("events.detail.seatingTab.create")}
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            {t("events.detail.seatingTab.results", { count: visiblePlans.length })}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-900">{t("events.detail.seatingTab.filterLabel")}</span>
              <Select value={eventFilterId} onValueChange={setEventFilterId}>
                <SelectTrigger className="h-10 min-w-[210px] border-zinc-300 bg-white" aria-label={t("events.detail.seatingTab.filterLabel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("events.detail.seatingTab.filterAllEvents")}</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-900">{t("events.detail.seatingTab.sortLabel")}</span>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value === "name" ? "name" : "updated")}>
                <SelectTrigger className="h-10 min-w-[230px] border-zinc-300 bg-white" aria-label={t("events.detail.seatingTab.sortLabel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">{t("events.detail.seatingTab.sortUpdated")}</SelectItem>
                  <SelectItem value="name">{t("events.detail.seatingTab.sortName")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {duplicateError || deleteError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {duplicateError ?? deleteError}
          </div>
        ) : null}
      </section>

      <Dialog
        open={planDialogMode !== null}
        onOpenChange={(open) => {
          if (open) return;
          closePlanDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl" closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>
              {isEditingPlan
                ? t("events.detail.seatingTab.editDialogTitle")
                : t("events.detail.seatingTab.createDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditingPlan
                ? t("events.detail.seatingTab.editDialogDescription")
                : t("events.detail.seatingTab.createDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form
            className="mt-2 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (isEditingPlan) {
                void handleUpdatePlan();
              } else {
                void handleCreatePlan();
              }
            }}
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="seating-plan-name">
                {t("events.detail.seatingTab.planNameLabel")}
              </label>
              <Input
                id="seating-plan-name"
                className="h-10 border-zinc-300 bg-white"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder={t("events.detail.seatingTab.planNamePlaceholder")}
                disabled={!canEdit || isSavingPlan}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="seating-plan-event">
                {t("events.detail.seatingTab.eventLabel")}
              </label>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
                disabled={!canEdit || isSavingPlan || events.length === 0}
              >
                <SelectTrigger id="seating-plan-event" className="h-10 border-zinc-300 bg-white" aria-label={t("events.detail.seatingTab.eventLabel")}>
                  <SelectValue placeholder={t("events.detail.seatingTab.selectEventForPlan")} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            ) : null}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closePlanDialog} disabled={isSavingPlan}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={isEditingPlan ? !canUpdatePlan : !canCreatePlan}>
                {isSavingPlan
                  ? t("events.detail.seatingTab.saving")
                  : isEditingPlan
                    ? t("events.detail.seatingTab.saveChanges")
                    : t("events.detail.seatingTab.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {visiblePlans.length ? (
        <section className="flex flex-col gap-3">
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              canEdit={canEdit}
              dateFormatter={dtf}
              href={routes.seatingPlan(plan.id)}
              isDuplicating={duplicatingPlanId === plan.id}
              isDeleting={deletingPlanId === plan.id}
              onDuplicate={(planId) => void handleDuplicatePlan(planId)}
              onDeleteRequest={setDeleteCandidate}
              onEditRequest={openEditDialog}
              t={t}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
          <AppEmptyState title={t("events.detail.seatingTab.empty")} />
        </section>
      )}

      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("events.detail.seatingTab.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? t("events.detail.seatingTab.deleteConfirmDescription", { name: deleteCandidate.name })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogDefaultCancel disabled={!!deletingPlanId}>{t("common.cancel")}</AlertDialogDefaultCancel>
            <AlertDialogDestructiveAction
              disabled={!!deletingPlanId}
              onClick={(event) => {
                event.preventDefault();
                void handleDeletePlan();
              }}
            >
              {deletingPlanId ? t("events.detail.seatingTab.deleting") : t("events.detail.seatingTab.deleteConfirmAction")}
            </AlertDialogDestructiveAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppWorkspacePage>
  );
}
