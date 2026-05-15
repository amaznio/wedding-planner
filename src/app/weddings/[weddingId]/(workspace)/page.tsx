"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildDashboardMockData } from "@/features/wedding-dashboard/dashboard.mock";
import type { DashboardEventCard, DashboardQuickActionId, WeddingDashboardData } from "@/features/wedding-dashboard/types";
import { WeddingDashboardHeader } from "@/features/wedding-dashboard/components/WeddingDashboardHeader";
import { WeddingOverviewHero } from "@/features/wedding-dashboard/components/WeddingOverviewHero";
import { WeddingEventsStrip } from "@/features/wedding-dashboard/components/WeddingEventsStrip";
import { PlanningProgressSection } from "@/features/wedding-dashboard/components/PlanningProgressSection";
import { DashboardWidgetsGrid } from "@/features/wedding-dashboard/components/DashboardWidgetsGrid";
import { DashboardTipBanner } from "@/features/wedding-dashboard/components/DashboardTipBanner";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";
import { authClient } from "@/lib/auth-client";

type WeddingDetailApiResponse = {
  access: {
    role: "owner" | "editor" | "viewer";
    canEdit: boolean;
    canManageMembers: boolean;
    canDeleteWedding: boolean;
  };
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
    events: Array<{
      id: string;
      name: string;
      type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
      startsAt: string | null;
    }>;
    _count: {
      guests: number;
      vendors: number;
      expenses: number;
      households: number;
      guestGroups: number;
    };
  };
};

type WeddingDashboardApiResponse = {
  currency: string;
  expenseSummary: Array<{
    status: string;
    _sum: { amountMinor: number | null };
    _count: { _all: number };
  }>;
  vendorSummary: {
    totalCostMinor: number;
    totalDepositMinor: number;
    totalPaidMinor: number;
    remainingMinor: number;
  };
};

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

export default function WeddingDashboardHomePage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const router = useRouter();
  const { t, locale } = useI18n();
  const { data: session } = authClient.useSession();

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

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [weddingResponse, dashboardResponse] = await Promise.all([
          fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/dashboard`, { cache: "no-store" }),
        ]);

        if (!weddingResponse.ok) throw new Error("weddingLoadFailed");
        if (!dashboardResponse.ok) throw new Error("dashboardLoadFailed");

        const weddingJson = (await weddingResponse.json()) as WeddingDetailApiResponse;
        const dashboardJson = (await dashboardResponse.json()) as WeddingDashboardApiResponse;

        const mappedEvents = mapEvents(weddingId, weddingJson.wedding.events);
        const expenseSpentMinor = dashboardJson.expenseSummary
          .filter((row) => row.status !== "canceled")
          .reduce((sum, row) => sum + (row._sum.amountMinor ?? 0), 0);

        const built = buildDashboardMockData({
          weddingId,
          weddingName: weddingJson.wedding.name,
          weddingDate: weddingJson.wedding.date ? new Date(weddingJson.wedding.date) : null,
          venue: weddingJson.wedding.location ?? undefined,
          coverImageUrl: weddingJson.wedding.coverImageUrl,
          currency: dashboardJson.currency,
          guestCount: weddingJson.wedding._count.guests,
          budgetMinor: dashboardJson.vendorSummary.totalCostMinor || undefined,
          spentMinor: dashboardJson.vendorSummary.totalPaidMinor || expenseSpentMinor || undefined,
          events: mappedEvents,
        });

        if (active) {
          setCanEditWedding(weddingJson.access?.canEdit ?? false);
          setData(built);
          setWeddingForm({
            name: weddingJson.wedding.name ?? "",
            date: weddingJson.wedding.date ? weddingJson.wedding.date.slice(0, 10) : "",
            timezone: weddingJson.wedding.timezone ?? "",
            location: weddingJson.wedding.location ?? "",
            currency: weddingJson.wedding.currency ?? "PLN",
            notes: weddingJson.wedding.notes ?? "",
          });
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
  }, [weddingId, t]);

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
    if (action === "expense") {
      router.push(`/weddings/${weddingId}/expenses`);
      return;
    }

    if (action === "vendor") {
      router.push(`/weddings/${weddingId}/vendors`);
      return;
    }

    if (action === "event" && firstEventHref) {
      router.push(firstEventHref);
      return;
    }

    handlePlaceholderAction(action);
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
        onQuickAction={handleQuickAction}
        onPlaceholderAction={handlePlaceholderAction}
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
          onPlaceholderAction={handlePlaceholderAction}
        />

        <DashboardTipBanner onAction={() => handlePlaceholderAction("tip")} />
      </div>

      <Dialog open={isWeddingDetailsOpen} onOpenChange={(open) => {
        setIsWeddingDetailsOpen(open);
        if (!open) {
          setWeddingSaveError(null);
          setCoverImageError(null);
        }
      }}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.overview.edit.title")}</DialogTitle>
            <DialogDescription>{t("dashboard.overview.edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="wedding-name" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.name")}
              </label>
              <Input
                id="wedding-name"
                value={weddingForm?.name ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                placeholder={t("dashboard.overview.edit.namePlaceholder")}
                disabled={isWeddingSaving}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="wedding-date" className="text-sm font-medium text-zinc-800">
                  {t("dashboard.overview.edit.date")}
                </label>
                <Input
                  id="wedding-date"
                  type="date"
                  value={weddingForm?.date ?? ""}
                  onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                  disabled={isWeddingSaving}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wedding-currency" className="text-sm font-medium text-zinc-800">
                  {t("dashboard.overview.edit.currency")}
                </label>
                <Input
                  id="wedding-currency"
                  value={weddingForm?.currency ?? ""}
                  onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, currency: event.target.value.toUpperCase() } : prev))}
                  placeholder="PLN"
                  maxLength={3}
                  disabled={isWeddingSaving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-timezone" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.timezone")}
              </label>
              <Input
                id="wedding-timezone"
                value={weddingForm?.timezone ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))}
                placeholder="Europe/Warsaw"
                disabled={isWeddingSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-location" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.location")}
              </label>
              <Input
                id="wedding-location"
                value={weddingForm?.location ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, location: event.target.value } : prev))}
                placeholder={t("dashboard.overview.edit.locationPlaceholder")}
                disabled={isWeddingSaving}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-800">{t("dashboard.overview.cover.title")}</p>
              <p className="text-xs text-zinc-500">{t("dashboard.overview.cover.description")}</p>
              <div className="overflow-hidden rounded-md border border-zinc-200">
                {data?.overview.coverImageUrl ? (
                  <div className="relative h-36 w-full">
                    <Image
                      src={data.overview.coverImageUrl}
                      alt={t("dashboard.overview.cover.previewAlt")}
                      fill
                      sizes="640px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-36 w-full bg-gradient-to-br from-rose-100 via-amber-50 to-violet-100" />
                )}
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCoverImageUploading || isWeddingSaving}
                  onClick={() => coverImageInputRef.current?.click()}
                >
                  {data?.overview.coverImageUrl
                    ? t("dashboard.overview.cover.replace")
                    : t("dashboard.overview.cover.upload")}
                </Button>
                {data?.overview.coverImageUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCoverImageUploading || isWeddingSaving}
                    onClick={() => void handleRemoveCoverImage()}
                  >
                    {t("dashboard.overview.cover.remove")}
                  </Button>
                ) : null}
              </div>
              {isCoverImageUploading ? (
                <p className="text-xs text-zinc-500">{t("dashboard.overview.cover.uploading")}</p>
              ) : null}
              {coverImageError ? <p className="text-sm text-red-600">{coverImageError}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-notes" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.notes")}
              </label>
              <textarea
                id="wedding-notes"
                value={weddingForm?.notes ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300"
                placeholder={t("dashboard.overview.edit.notesPlaceholder")}
                disabled={isWeddingSaving}
              />
            </div>
            {weddingSaveError ? <p className="text-sm text-red-600">{weddingSaveError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsWeddingDetailsOpen(false)} disabled={isWeddingSaving}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => void handleWeddingSave()} disabled={isWeddingSaving}>
                {isWeddingSaving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

function mapEvents(
  weddingId: string,
  events: WeddingDetailApiResponse["wedding"]["events"],
): DashboardEventCard[] {
  if (!events.length) return [];

  const activeEventId = events.find((event) => event.type === "wedding")?.id ?? events[0].id;

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.startsAt ? new Date(event.startsAt) : new Date(),
    href: `/weddings/${weddingId}/events/${event.id}`,
    status: event.id === activeEventId ? "active" : "planned",
    type: event.type,
  }));
}
