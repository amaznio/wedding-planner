"use client";

import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/provider";
import { WeddingDashboardShell } from "@/features/wedding-dashboard/components/WeddingDashboardShell";
import { WeddingDashboardSidebar } from "@/features/wedding-dashboard/components/WeddingDashboardSidebar";
import type { DashboardNavItem } from "../types";

export type WorkspaceBreadcrumbItem = {
  label: string;
  href?: string;
};

type WeddingWorkspaceShellProps = {
  weddingId: string;
  navigation: DashboardNavItem[];
  eventNamesById: Record<string, string>;
  currentUser: {
    name: string;
    email: string;
    image?: string | null;
  };
  children: ReactNode;
};

type WeddingWorkspaceShellContextValue = {
  openSidebar: () => void;
  closeSidebar: () => void;
  setBreadcrumbOverride: (items: WorkspaceBreadcrumbItem[] | null) => void;
  clearBreadcrumbOverride: () => void;
};

const WeddingWorkspaceShellContext = createContext<WeddingWorkspaceShellContextValue | null>(null);

export function WeddingWorkspaceShell({
  weddingId,
  navigation,
  eventNamesById,
  currentUser,
  children,
}: WeddingWorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider
      className="min-h-screen bg-gradient-to-b from-zinc-50 via-rose-50/20 to-zinc-100"
      style={{ "--sidebar-width": "260px", "--sidebar-width-mobile": "320px" } as CSSProperties}
    >
      <WeddingWorkspaceShellInner
        weddingId={weddingId}
        navigation={navigation}
        eventNamesById={eventNamesById}
        currentUser={currentUser}
        currentPath={pathname}
      >
        {children}
      </WeddingWorkspaceShellInner>
    </SidebarProvider>
  );
}

type WeddingWorkspaceShellInnerProps = Omit<WeddingWorkspaceShellProps, "children"> & {
  currentPath: string;
  children: ReactNode;
};

function WeddingWorkspaceShellInner({
  weddingId,
  navigation,
  eventNamesById,
  currentUser,
  currentPath,
  children,
}: WeddingWorkspaceShellInnerProps) {
  const { t } = useI18n();
  const { setOpenMobile } = useSidebar();
  const [breadcrumbOverride, setBreadcrumbOverride] = useState<WorkspaceBreadcrumbItem[] | null>(null);

  const defaultBreadcrumbs = useMemo(
    () =>
      buildWorkspaceBreadcrumbs({
        currentPath,
        weddingId,
        navigation,
        eventNamesById,
        t,
      }),
    [currentPath, eventNamesById, navigation, t, weddingId],
  );

  const breadcrumbs = breadcrumbOverride ?? defaultBreadcrumbs;

  const contextValue = useMemo<WeddingWorkspaceShellContextValue>(
    () => ({
      openSidebar: () => setOpenMobile(true),
      closeSidebar: () => setOpenMobile(false),
      setBreadcrumbOverride,
      clearBreadcrumbOverride: () => setBreadcrumbOverride(null),
    }),
    [setOpenMobile],
  );

  return (
    <WeddingWorkspaceShellContext.Provider value={contextValue}>
      <WeddingDashboardShell
        topBar={<WeddingWorkspaceTopBar breadcrumbs={breadcrumbs} />}
        sidebar={(
          <WeddingDashboardSidebar
            currentPath={currentPath}
            navigation={navigation}
            currentUser={currentUser}
            onPlaceholderAction={() => {
              setOpenMobile(false);
            }}
          />
        )}
      >
        {children}
      </WeddingDashboardShell>
    </WeddingWorkspaceShellContext.Provider>
  );
}

function WeddingWorkspaceTopBar({ breadcrumbs }: { breadcrumbs: WorkspaceBreadcrumbItem[] }) {
  return (
    <header className="flex h-12 items-center gap-1.5 px-2 sm:px-3">
      <SidebarTrigger className="size-7 [&>svg]:size-4" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <BreadcrumbItem key={`${item.label}-${index}`}>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
                {!isLast ? <BreadcrumbSeparator /> : null}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

type BuildWorkspaceBreadcrumbsParams = {
  currentPath: string;
  weddingId: string;
  navigation: DashboardNavItem[];
  eventNamesById: Record<string, string>;
  t: (key: string) => string;
};

function buildWorkspaceBreadcrumbs({
  currentPath,
  weddingId,
  navigation,
  eventNamesById,
  t,
}: BuildWorkspaceBreadcrumbsParams): WorkspaceBreadcrumbItem[] {
  const normalizedPath = normalizePath(currentPath);
  const weddingHomeHref = `/weddings/${weddingId}`;
  const eventsHref = navigation.find((item) => item.id === "events")?.href;

  const home = [{ label: t("common.home"), href: weddingHomeHref }];

  if (normalizedPath === weddingHomeHref || normalizedPath === `${weddingHomeHref}/dashboard`) {
    return home;
  }

  if (normalizedPath === `${weddingHomeHref}/guests`) {
    return [...home, { label: t("dashboard.sidebar.nav.guests") }];
  }

  if (normalizedPath === `${weddingHomeHref}/collaborators`) {
    return [...home, { label: t("dashboard.sidebar.nav.collaborators") }];
  }

  if (normalizedPath === `${weddingHomeHref}/vendors`) {
    return [...home, { label: t("dashboard.sidebar.nav.vendors") }];
  }

  if (normalizedPath === `${weddingHomeHref}/expenses`) {
    return [...home, { label: t("dashboard.sidebar.nav.budget") }];
  }

  if (normalizedPath.startsWith(`${weddingHomeHref}/events/`)) {
    const segments = normalizedPath.split("/").filter(Boolean);
    const eventId = segments[3] ?? "";
    const eventName = eventNamesById[eventId] ?? t("dashboard.sidebar.nav.events");

    return [
      ...home,
      { label: t("dashboard.sidebar.nav.events"), href: eventsHref },
      { label: eventName },
    ];
  }

  const fallbackSegment = normalizedPath.split("/").filter(Boolean).at(-1);
  if (!fallbackSegment) {
    return home;
  }

  return [...home, { label: fallbackSegment }];
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function useWeddingWorkspaceShell(): WeddingWorkspaceShellContextValue {
  const context = useContext(WeddingWorkspaceShellContext);
  if (!context) {
    return {
      openSidebar: () => undefined,
      closeSidebar: () => undefined,
      setBreadcrumbOverride: () => undefined,
      clearBreadcrumbOverride: () => undefined,
    };
  }
  return context;
}
