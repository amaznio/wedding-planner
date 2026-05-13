import type { ReactNode } from "react";

type WeddingDashboardShellProps = {
  sidebar: ReactNode;
  mobileSidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export function WeddingDashboardShell({
  sidebar,
  mobileSidebar,
  header,
  children,
}: WeddingDashboardShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-rose-50/20 to-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-[260px] shrink-0 lg:block">{sidebar}</aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {mobileSidebar}
          <div className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
            {header}
          </div>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
