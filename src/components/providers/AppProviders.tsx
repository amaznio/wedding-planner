"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
