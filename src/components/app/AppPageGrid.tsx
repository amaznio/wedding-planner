import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppPageGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5", className)}>{children}</div>;
}
