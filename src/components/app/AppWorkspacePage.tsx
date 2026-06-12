import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppWorkspacePageProps = {
  children: ReactNode;
  className?: string;
  as?: "main" | "div";
};

export function AppWorkspacePage({ children, className, as: Component = "main" }: AppWorkspacePageProps) {
  return (
    <Component className={cn("flex w-full max-w-[1180px] flex-col", className)}>
      {children}
    </Component>
  );
}
