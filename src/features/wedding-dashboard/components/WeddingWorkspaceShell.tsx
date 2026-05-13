"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/provider";
import { WeddingDashboardShell } from "@/features/wedding-dashboard/components/WeddingDashboardShell";
import { WeddingDashboardSidebar } from "@/features/wedding-dashboard/components/WeddingDashboardSidebar";
import type { DashboardNavItem } from "../types";

type WeddingWorkspaceShellProps = {
  weddingName: string;
  weddingDateLabel: string;
  navigation: DashboardNavItem[];
  currentUser: {
    name: string;
    email: string;
  };
  children: ReactNode;
};

type WeddingWorkspaceShellContextValue = {
  openSidebar: () => void;
  closeSidebar: () => void;
};

const WeddingWorkspaceShellContext = createContext<WeddingWorkspaceShellContextValue | null>(null);

export function WeddingWorkspaceShell({
  weddingName,
  weddingDateLabel,
  navigation,
  currentUser,
  children,
}: WeddingWorkspaceShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const contextValue = useMemo<WeddingWorkspaceShellContextValue>(
    () => ({
      openSidebar: () => setIsMobileSidebarOpen(true),
      closeSidebar: () => setIsMobileSidebarOpen(false),
    }),
    [],
  );

  return (
    <WeddingWorkspaceShellContext.Provider value={contextValue}>
      <WeddingDashboardShell
        sidebar={(
          <WeddingDashboardSidebar
            weddingName={weddingName}
            weddingDateLabel={weddingDateLabel}
            currentPath={pathname}
            navigation={navigation}
            currentUser={currentUser}
            onPlaceholderAction={() => undefined}
          />
        )}
        mobileSidebar={(
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0">
              <SheetTitle className="sr-only">{t("dashboard.sidebar.mobileTitle")}</SheetTitle>
              <WeddingDashboardSidebar
                weddingName={weddingName}
                weddingDateLabel={weddingDateLabel}
                currentPath={pathname}
                navigation={navigation}
                currentUser={currentUser}
                onPlaceholderAction={() => {
                  setIsMobileSidebarOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
        )}
      >
        {children}
      </WeddingDashboardShell>
    </WeddingWorkspaceShellContext.Provider>
  );
}

export function useWeddingWorkspaceShell(): WeddingWorkspaceShellContextValue {
  const context = useContext(WeddingWorkspaceShellContext);
  if (!context) {
    return {
      openSidebar: () => undefined,
      closeSidebar: () => undefined,
    };
  }
  return context;
}
