"use client";

import { useI18n } from "@/i18n/provider";

export function CollaboratorsHeader() {
  const { t } = useI18n();

  return (
    <header className="px-1 py-1">
      <h1 className="text-3xl font-semibold text-zinc-900">{t("weddingCollaboratorsPage.title")}</h1>
      <p className="mt-1 text-sm text-zinc-600">{t("weddingCollaboratorsPage.subtitleOwner")}</p>
    </header>
  );
}
