import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppFormFieldProps = {
  label: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function AppFormField({ label, children, description, className }: AppFormFieldProps) {
  return (
    <div className={cn("grid w-full gap-1.5 text-sm font-medium text-zinc-900", className)}>
      <span>{label}</span>
      {children}
      {description ? <p className="text-xs font-normal text-zinc-500">{description}</p> : null}
    </div>
  );
}
