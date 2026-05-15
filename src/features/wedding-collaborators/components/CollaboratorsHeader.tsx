"use client";

import { useI18n } from "@/i18n/provider";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";

export function CollaboratorsHeader() {
  const { t } = useI18n();

  return (
    <WorkspacePageHeader
      title={t("weddingCollaboratorsPage.title")}
      subtitle={t("weddingCollaboratorsPage.subtitleOwner")}
    />
  );
}
