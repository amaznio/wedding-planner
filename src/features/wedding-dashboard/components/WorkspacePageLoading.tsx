"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type CountProps = {
  count?: number;
  className?: string;
};

type WorkspaceManagementPageLoadingProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  primaryActionLabel?: ReactNode;
  secondaryActionLabel?: ReactNode;
  statsCount?: number;
  content?: "rows" | "cards" | "panels";
  showFilters?: boolean;
};

export function WorkspaceStatsSkeleton({ count = 3, className }: CountProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-y-2", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-baseline gap-1.5 border-l border-zinc-300 px-4 first:border-l-0 first:pl-0 last:pr-0"
        >
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function WorkspaceRowsSkeleton({ count = 4, className }: CountProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceCardGridSkeleton({ count = 4, className }: CountProps) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="min-h-48 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-3 h-4 w-52 max-w-full" />
          <Skeleton className="mt-8 h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

export function WorkspacePanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("min-h-48 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs", className)}
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function WorkspaceManagementPageLoading({
  title,
  subtitle,
  primaryActionLabel,
  secondaryActionLabel,
  statsCount = 3,
  content = "rows",
  showFilters = true,
}: WorkspaceManagementPageLoadingProps) {
  return (
    <AppWorkspacePage>
      <WeddingPageHeader
        title={title}
        subtitle={subtitle}
        actions={
          primaryActionLabel || secondaryActionLabel ? (
            <>
              {secondaryActionLabel ? <Button type="button" variant="outline" disabled>{secondaryActionLabel}</Button> : null}
              {primaryActionLabel ? <Button type="button" variant="primary" disabled>{primaryActionLabel}</Button> : null}
            </>
          ) : undefined
        }
      />
      <WorkspaceStatsSkeleton count={statsCount} className="mt-5" />
      {showFilters ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row" aria-hidden="true">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-10 w-full sm:w-44" />
        </div>
      ) : null}
      {content === "cards" ? <WorkspaceCardGridSkeleton className="mt-5" /> : null}
      {content === "rows" ? <WorkspaceRowsSkeleton className="mt-5" /> : null}
      {content === "panels" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <WorkspacePanelSkeleton className="min-h-72" />
          <WorkspacePanelSkeleton className="min-h-72" />
        </div>
      ) : null}
    </AppWorkspacePage>
  );
}

export function WeddingDashboardPageLoading() {
  const { t } = useI18n();

  return (
    <>
      <WeddingPageHeader title={t("dashboard.sidebar.nav.home")} subtitle={t("dashboard.header.subtitle")} />
      <div className="mt-5 flex flex-col gap-5">
        <WorkspacePanelSkeleton className="min-h-64" />
        <WorkspaceRowsSkeleton count={2} />
        <WorkspaceCardGridSkeleton />
      </div>
    </>
  );
}

export function WeddingEventsListPageLoading() {
  return (
    <WeddingEventsListPageShell>
      <WeddingEventsListContentLoading />
    </WeddingEventsListPageShell>
  );
}

export function WeddingEventsListPageShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <AppWorkspacePage>
      <WeddingPageHeader
        title={t("events.list.title")}
        subtitle={t("events.list.subtitle")}
        actions={(
          <Button type="button" variant="primary" disabled>
            <Plus className="size-4" />
            {t("events.actions.addEvent")}
          </Button>
        )}
      />
      {children}
    </AppWorkspacePage>
  );
}

export function WeddingEventsListContentLoading() {
  const { t } = useI18n();

  return (
    <>
      <WorkspaceStatsSkeleton count={4} className="mt-5" />
      <div className="mt-5 border-b border-zinc-200 pb-2">
        <div className="flex gap-5 text-sm text-zinc-600">
          <span>{t("events.list.filters.all")}</span>
          <span>{t("events.list.filters.upcoming")}</span>
          <span>{t("events.list.filters.completed")}</span>
        </div>
      </div>
      <Skeleton className="mt-4 h-10 w-full max-w-md" />
      <WorkspaceRowsSkeleton className="mt-4" />
    </>
  );
}

export function WeddingEventDetailPageLoading() {
  const { t } = useI18n();

  return (
    <>
      <WeddingPageHeader
        title={t("events.detail.title")}
        actions={(
          <>
            <Button type="button" variant="outline" disabled>
              {t("events.detail.actions.guestPreview")}
            </Button>
            <Button type="button" variant="primary" disabled>
              {t("events.detail.actions.editEvent")}
            </Button>
          </>
        )}
      />
      <div className="mt-5 flex flex-col gap-5">
        <div className="flex gap-5 border-b border-zinc-200 pb-3" aria-hidden="true">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <WorkspacePanelSkeleton className="min-h-72" />
          <WorkspacePanelSkeleton className="min-h-72" />
        </div>
      </div>
    </>
  );
}

export function WeddingSeatingPageLoading() {
  return (
    <WeddingSeatingPageShell>
      <WeddingSeatingContentLoading />
    </WeddingSeatingPageShell>
  );
}

export function WeddingSeatingPageShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <AppWorkspacePage className="gap-5">
      <WeddingPageHeader
        title={t("dashboard.sidebar.nav.seating")}
        subtitle={t("events.detail.seatingTab.description")}
        actions={(
          <Button type="button" variant="primary" disabled>
            <Plus className="size-4" />
            {t("events.detail.seatingTab.create")}
          </Button>
        )}
      />
      {children}
    </AppWorkspacePage>
  );
}

export function WeddingSeatingContentLoading() {
  const { t } = useI18n();

  return (
    <>
      <WorkspaceStatsSkeleton />
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,260px)_minmax(190px,230px)_auto]">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Button type="button" variant="primary" disabled>
          <Plus className="size-4" />
          {t("events.detail.seatingTab.create")}
        </Button>
      </div>
      <WorkspaceRowsSkeleton />
    </>
  );
}
