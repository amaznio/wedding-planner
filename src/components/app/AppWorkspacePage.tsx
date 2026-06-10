import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppWorkspacePageProps = {
  children: ReactNode;
  className?: string;
};

export function AppWorkspacePage({ children, className }: AppWorkspacePageProps) {
  return (
    <main className={cn("flex w-full max-w-[1180px] flex-col", className)}>
      {children}
    </main>
  );
}
