"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";

export function AppProviders({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <TooltipProvider>{children}</TooltipProvider>
    </I18nProvider>
  );
}
