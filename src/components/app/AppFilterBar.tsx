import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppFilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function AppFilterBar({ children, className }: AppFilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", className)}>
      {children}
    </div>
  );
}
