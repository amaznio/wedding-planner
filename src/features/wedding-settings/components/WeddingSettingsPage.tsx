"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

const settingsItems = [
  "notifications",
  "weeklyDigest",
  "guestUpdates",
  "vendorReminders",
] as const;

export function WeddingSettingsPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col">
      <WeddingPageHeader title={t("settings.page.title")} subtitle={t("settings.page.subtitle")} />
      <AppPageGrid className="mt-5 md:grid-cols-2">
        <AppSectionCard title={t("settings.page.preferences.title")} description={t("settings.page.preferences.description")}>
          <div className="space-y-3">
            {settingsItems.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2">
                <Checkbox id={`setting-${item}`} defaultChecked={index < 2} />
                <label htmlFor={`setting-${item}`} className="text-sm text-zinc-700">
                  {t(`settings.page.preferences.items.${item}`)}
                </label>
              </div>
            ))}
          </div>
        </AppSectionCard>
        <AppSectionCard title={t("settings.page.workspace.title")} description={t("settings.page.workspace.description")}>
          <ul className="space-y-2 text-sm text-zinc-700">
            <li>{t("settings.page.workspace.rows.locale")}</li>
            <li>{t("settings.page.workspace.rows.timezone")}</li>
            <li>{t("settings.page.workspace.rows.currency")}</li>
          </ul>
        </AppSectionCard>
      </AppPageGrid>
    </main>
  );
}
