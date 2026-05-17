"use client";

import { useI18n } from "@/i18n/provider";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

type WeddingDashboardHeaderProps = {
  firstName: string;
};

export function WeddingDashboardHeader({
  firstName,
}: WeddingDashboardHeaderProps) {
  const { t } = useI18n();

  return (
    <WorkspacePageHeader
      title={t("dashboard.header.greeting", { name: firstName })}
      subtitle={t("dashboard.header.subtitle")}
    />
  );
}
