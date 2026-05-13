import type { ReactNode } from "react";
import { SidebarInset } from "@/components/ui/sidebar";

type WeddingDashboardShellProps = {
  sidebar: ReactNode;
  topBar?: ReactNode;
  children: ReactNode;
};

export function WeddingDashboardShell({
  sidebar,
  topBar,
  children,
}: WeddingDashboardShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      {sidebar}
      <SidebarInset className="min-h-screen min-w-0 flex-1 bg-transparent">
        {topBar ? (
          <div className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
            {topBar}
          </div>
        ) : null}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </SidebarInset>
    </div>
  );
}
