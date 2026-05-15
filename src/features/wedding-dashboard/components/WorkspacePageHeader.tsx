"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type WorkspacePageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function WorkspacePageHeader({ title, subtitle, actions, className }: WorkspacePageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2 px-1 py-1", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-semibold text-zinc-900">{title}</h1>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {subtitle ? <p className="text-sm text-zinc-600">{subtitle}</p> : null}
    </header>
  );
}
