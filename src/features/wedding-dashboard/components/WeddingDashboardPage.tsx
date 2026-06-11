"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DashboardQuickActionId, WeddingDashboardData } from "@/features/wedding-dashboard/types";
import { WeddingDashboardHeader } from "@/features/wedding-dashboard/components/WeddingDashboardHeader";
import { WeddingOverviewHero } from "@/features/wedding-dashboard/components/WeddingOverviewHero";
import { WeddingEventsStrip } from "@/features/wedding-dashboard/components/WeddingEventsStrip";
import { PlanningProgressSection } from "@/features/wedding-dashboard/components/PlanningProgressSection";
import { DashboardWidgetsGrid } from "@/features/wedding-dashboard/components/DashboardWidgetsGrid";
import { DashboardTipBanner } from "@/features/wedding-dashboard/components/DashboardTipBanner";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";
import { authClient } from "@/lib/auth-client";
import { fetchWeddingDashboardViewModel } from "@/features/wedding-dashboard/lib/fetch-dashboard-view-model";
import { getWeddingRoutes } from "@/lib/routes";
import { WeddingDashboardDetailsDialog } from "@/features/wedding-dashboard/components/WeddingDashboardDetailsDialog";
import { CreateWeddingNoteDialog } from "@/features/wedding-notes/components/CreateWeddingNoteDialog";
import { CreateWeddingTaskDialog } from "@/features/wedding-tasks/components/CreateWeddingTaskDialog";
import { CreateWeddingPaymentDialog } from "@/features/wedding-finances/components/CreateWeddingPaymentDialog";
import { CreateWeddingVendorDialog } from "@/features/wedding-vendors/components/CreateWeddingVendorDialog";
import { toast } from "@/components/ui/use-toast";

type WeddingFormState = {
  name: string;
  date: string;
  timezone: string;
  location: string;
  currency: string;
  notes: string;
};

type WeddingUpdateApiResponse = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    timezone: string | null;
    location: string | null;
    currency: string;
    notes: string | null;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    coverImageWidth: number | null;
    coverImageHeight: number | null;
    coverImageUploadedAt: string | null;
  };
};

type WeddingCoverSignApiResponse = {
  signedUpload: {
    cloudName: string;
    apiKey: string;
    uploadUrl: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
  };
};

type WeddingCoverSaveApiResponse = {
  wedding: {
    id: string;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    coverImageWidth: number | null;
    coverImageHeight: number | null;
    coverImageUploadedAt: string | null;
  };
};

const COVER_IMAGE_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const COVER_IMAGE_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TASK_COMPLETION_SUCCESS_DURATION_MS = 800;

type WeddingDashboardPageProps = {
  weddingId: string;
};

export function WeddingDashboardPage({ weddingId }: WeddingDashboardPageProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { data: session } = authClient.useSession();
  const routes = getWeddingRoutes(weddingId);

  const [data, setData] = useState<WeddingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeholderKey, setPlaceholderKey] = useState<string | null>(null);
  const [isWeddingDetailsOpen, setIsWeddingDetailsOpen] = useState(false);
  const [weddingForm, setWeddingForm] = useState<WeddingFormState | null>(null);
  const [isWeddingSaving, setIsWeddingSaving] = useState(false);
  const [weddingSaveError, setWeddingSaveError] = useState<string | null>(null);
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const [canEditWedding, setCanEditWedding] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextModel = await fetchWeddingDashboardViewModel(weddingId);
        if (active) {
          setCanEditWedding(nextModel.canEditWedding);
          setData(nextModel.dashboardData);
          setWeddingForm(nextModel.weddingForm);
        }
      } catch {
        if (active) {
          setError(t("dashboard.states.loadError"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [weddingId, t, dashboardReloadKey]);

  const firstEventHref = useMemo(() => data?.events.find((event) => event.href)?.href, [data?.events]);

  if (isLoading) {
    return <WorkspaceRouteLoading />;
  }

  if (error) {
    return <main className="p-6 text-sm text-red-600">{error}</main>;
  }

  if (!data) {
    return <WorkspaceRouteLoading />;
  }

  const handlePlaceholderAction = (key: string) => {
    setPlaceholderKey(key);
  };

  const handleQuickAction = (action: DashboardQuickActionId) => {
    if (action === "task") {
      setCreateTaskOpen(true);
      return;
    }

    if (action === "note") {
      setCreateNoteOpen(true);
      return;
    }

    if (action === "expense") {
      setCreatePaymentOpen(true);
      return;
    }

    if (action === "vendor") {
      setCreateVendorOpen(true);
      return;
    }

    if (action === "event" && firstEventHref) {
      router.push(firstEventHref);
      return;
    }

    handlePlaceholderAction(action);
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!canEditWedding || completingTaskIds.has(taskId)) return;

    const startedAt = Date.now();
    setCompletingTaskIds((current) => new Set(current).add(taskId));

    try {
      const response = await fetch(`/api/weddings/${weddingId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!response.ok) throw new Error("taskCompletionFailed");

      const remainingSuccessDuration = Math.max(
        0,
        TASK_COMPLETION_SUCCESS_DURATION_MS - (Date.now() - startedAt),
      );
      await new Promise((resolve) => setTimeout(resolve, remainingSuccessDuration));

      try {
        const nextModel = await fetchWeddingDashboardViewModel(weddingId);
        setCanEditWedding(nextModel.canEditWedding);
        setData(nextModel.dashboardData);
        setWeddingForm(nextModel.weddingForm);
      } catch {
        setData((current) => {
          if (!current) return current;
          return {
            ...current,
            activeTasksCount: Math.max(0, current.activeTasksCount - 1),
            upcomingTasks: current.upcomingTasks.filter((task) => task.id !== taskId),
            navigation: current.navigation.map((item) => (
              item.id === "tasks"
                ? { ...item, counter: Math.max(0, (item.counter ?? 0) - 1) }
                : item
            )),
          };
        });
      }

      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: t("dashboard.widgets.upcomingTasks.completeError"),
      });
    } finally {
      setCompletingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleWeddingSave = async () => {
    if (!canEditWedding) return;
    if (!weddingForm) return;

    const trimmedName = weddingForm.name.trim();
    const trimmedCurrency = weddingForm.currency.trim().toUpperCase();

    if (!trimmedName || trimmedCurrency.length !== 3) {
      setWeddingSaveError(t("dashboard.overview.edit.errorInvalid"));
      return;
    }

    setIsWeddingSaving(true);
    setWeddingSaveError(null);

    try {
      const payload = {
        name: trimmedName,
        date: weddingForm.date.trim() ? weddingForm.date.trim() : null,
        timezone: weddingForm.timezone.trim() ? weddingForm.timezone.trim() : null,
        location: weddingForm.location.trim() ? weddingForm.location.trim() : null,
        currency: trimmedCurrency,
        notes: weddingForm.notes.trim() ? weddingForm.notes.trim() : null,
      };

      const response = await fetch(`/api/weddings/${weddingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Failed to update wedding");
      }

      const json = (await response.json()) as WeddingUpdateApiResponse;
      const nextWeddingDate = json.wedding.date ? new Date(json.wedding.date) : null;

      setWeddingForm({
        name: json.wedding.name,
        date: json.wedding.date ? json.wedding.date.slice(0, 10) : "",
        timezone: json.wedding.timezone ?? "",
        location: json.wedding.location ?? "",
        currency: json.wedding.currency ?? "PLN",
        notes: json.wedding.notes ?? "",
      });

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          weddingName: json.wedding.name,
          weddingDate: nextWeddingDate ?? prev.weddingDate,
          overview: {
            ...prev.overview,
            coupleNames: json.wedding.name,
            weddingDate: nextWeddingDate ?? prev.overview.weddingDate,
            venue: json.wedding.location?.trim() || prev.overview.venue,
            currency: json.wedding.currency,
          },
        };
      });

      setIsWeddingDetailsOpen(false);
      router.refresh();
    } catch (saveError) {
      setWeddingSaveError(saveError instanceof Error ? saveError.message : t("dashboard.overview.edit.errorSave"));
    } finally {
      setIsWeddingSaving(false);
    }
  };

  const setCoverImageOnDashboard = (coverImageUrl: string | null) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        overview: {
          ...prev.overview,
          coverImageUrl,
        },
      };
    });
  };

  const handleCoverImageFileSelect = async (file: File | null) => {
    if (!canEditWedding || !file) return;

    if (!COVER_IMAGE_ALLOWED_TYPES.has(file.type)) {
      setCoverImageError(t("dashboard.overview.cover.errors.invalidType"));
      return;
    }

    if (file.size > COVER_IMAGE_MAX_FILE_SIZE_BYTES) {
      setCoverImageError(t("dashboard.overview.cover.errors.maxSize"));
      return;
    }

    setIsCoverImageUploading(true);
    setCoverImageError(null);

    try {
      const signResponse = await fetch(`/api/weddings/${weddingId}/cover/sign`, {
        method: "POST",
        cache: "no-store",
      });
      if (!signResponse.ok) {
        throw new Error(t("dashboard.overview.cover.errors.signFailed"));
      }

      const signJson = (await signResponse.json()) as WeddingCoverSignApiResponse;
      const signedUpload = signJson.signedUpload;

      const cloudinaryUploadBody = new FormData();
      cloudinaryUploadBody.append("file", file);
      cloudinaryUploadBody.append("api_key", signedUpload.apiKey);
      cloudinaryUploadBody.append("timestamp", String(signedUpload.timestamp));
      cloudinaryUploadBody.append("signature", signedUpload.signature);
      cloudinaryUploadBody.append("folder", signedUpload.folder);
      cloudinaryUploadBody.append("public_id", signedUpload.publicId);

      const uploadResponse = await fetch(signedUpload.uploadUrl, {
        method: "POST",
        body: cloudinaryUploadBody,
      });
      if (!uploadResponse.ok) {
        throw new Error(t("dashboard.overview.cover.errors.uploadFailed"));
      }

      const uploadJson = (await uploadResponse.json()) as {
        secure_url?: string;
        public_id?: string;
        width?: number;
        height?: number;
      };

      if (!uploadJson.secure_url || !uploadJson.public_id || !uploadJson.width || !uploadJson.height) {
        throw new Error(t("dashboard.overview.cover.errors.uploadFailed"));
      }

      const saveResponse = await fetch(`/api/weddings/${weddingId}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secureUrl: uploadJson.secure_url,
          publicId: uploadJson.public_id,
          width: uploadJson.width,
          height: uploadJson.height,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(t("dashboard.overview.cover.errors.saveFailed"));
      }

      const saveJson = (await saveResponse.json()) as WeddingCoverSaveApiResponse;
      setCoverImageOnDashboard(saveJson.wedding.coverImageUrl);
    } catch (uploadError) {
      setCoverImageError(uploadError instanceof Error ? uploadError.message : t("dashboard.overview.cover.errors.generic"));
    } finally {
      setIsCoverImageUploading(false);
    }
  };

  const handleRemoveCoverImage = async () => {
    if (!canEditWedding) return;

    setCoverImageError(null);
    setIsCoverImageUploading(true);

    try {
      const response = await fetch(`/api/weddings/${weddingId}/cover`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(t("dashboard.overview.cover.errors.removeFailed"));
      }

      setCoverImageOnDashboard(null);
    } catch (removeError) {
      setCoverImageError(removeError instanceof Error ? removeError.message : t("dashboard.overview.cover.errors.generic"));
    } finally {
      setIsCoverImageUploading(false);
    }
  };

  const sessionFirstName = session?.user.name?.trim().split(/\s+/)[0] ?? null;
  const greetingName = sessionFirstName || data.currentUser.name.split(" ")[0] || data.currentUser.name;

  return (
    <>
        <WeddingDashboardHeader
          firstName={greetingName}
        />
      <div className="mt-5 flex flex-col gap-5">
        <WeddingOverviewHero
          overview={data.overview}
          locale={locale as Locale}
          onOpenDetails={() => {
            if (!canEditWedding) return;
            setWeddingSaveError(null);
            setCoverImageError(null);
            setIsWeddingDetailsOpen(true);
          }}
        />

        <WeddingEventsStrip
          events={data.events}
          locale={locale as Locale}
          onAddEvent={() => handlePlaceholderAction("addEvent")}
        />

        <PlanningProgressSection
          rows={data.planningProgress}
          overview={data.overview}
          notesCount={data.notesCount}
          documentsCount={data.documentsCount}
          locale={locale as Locale}
          onPlaceholderAction={handlePlaceholderAction}
        />

        <DashboardWidgetsGrid
          tasks={data.upcomingTasks}
          expenses={data.recentExpenses}
          actions={data.quickActions}
          currency={data.overview.currency}
          totalSpentMinor={data.overview.spentMinor}
          locale={locale as Locale}
          onQuickAction={handleQuickAction}
          onOpenTasks={() => router.push(routes.tasks)}
          onOpenFinances={() => router.push(routes.budget)}
          canEditTasks={canEditWedding}
          completingTaskIds={completingTaskIds}
          onCompleteTask={(taskId) => void handleCompleteTask(taskId)}
        />

        <DashboardTipBanner onAction={() => handlePlaceholderAction("tip")} />
      </div>

      <input
        ref={coverImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void handleCoverImageFileSelect(file);
        }}
      />

      <WeddingDashboardDetailsDialog
        open={isWeddingDetailsOpen}
        onOpenChange={setIsWeddingDetailsOpen}
        weddingForm={weddingForm}
        onWeddingFormChange={setWeddingForm}
        isWeddingSaving={isWeddingSaving}
        onSave={() => void handleWeddingSave()}
        weddingSaveError={weddingSaveError}
        coverImageUrl={data?.overview.coverImageUrl}
        isCoverImageUploading={isCoverImageUploading}
        coverImageError={coverImageError}
        onChooseCover={() => coverImageInputRef.current?.click()}
        onRemoveCover={() => void handleRemoveCoverImage()}
        onClearErrors={() => {
          setWeddingSaveError(null);
          setCoverImageError(null);
        }}
        canEditWedding={canEditWedding}
      />

      <CreateWeddingTaskDialog
        weddingId={weddingId}
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onCreated={() => {
          router.refresh();
          setDashboardReloadKey((current) => current + 1);
        }}
      />
      <CreateWeddingNoteDialog
        weddingId={weddingId}
        open={createNoteOpen}
        onOpenChange={setCreateNoteOpen}
        onCreated={() => {
          router.refresh();
          setDashboardReloadKey((current) => current + 1);
        }}
      />
      <CreateWeddingPaymentDialog
        weddingId={weddingId}
        open={createPaymentOpen}
        onOpenChange={setCreatePaymentOpen}
        onCreated={() => {
          router.refresh();
          setDashboardReloadKey((current) => current + 1);
        }}
      />
      <CreateWeddingVendorDialog
        weddingId={weddingId}
        open={createVendorOpen}
        onOpenChange={setCreateVendorOpen}
        onCreated={() => {
          router.refresh();
          setDashboardReloadKey((current) => current + 1);
        }}
      />

      <Dialog open={placeholderKey !== null} onOpenChange={(open) => { if (!open) setPlaceholderKey(null); }}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.placeholders.title")}</DialogTitle>
            <DialogDescription>
              {placeholderKey ? t(`dashboard.placeholders.items.${placeholderKey}`) : t("dashboard.placeholders.default")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setPlaceholderKey(null)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

