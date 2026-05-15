"use client";

import { Bell, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";

type GuestsPageHeaderProps = {
  notificationCount: number;
  onAction: (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => void;
};

export function GuestsPageHeader({ notificationCount, onAction }: GuestsPageHeaderProps) {
  const { t } = useI18n();

  return (
    <WorkspacePageHeader
      title={t("weddingGuestsPage.title")}
      subtitle={t("weddingGuestsPage.subtitle")}
      actions={(
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative"
            aria-label={t("dashboard.header.notifications")}
          >
            <Bell className="size-4" />
            {notificationCount > 0 ? (
              <Badge className="absolute -right-1.5 -top-1.5 min-w-5 justify-center px-1.5">
                {notificationCount}
              </Badge>
            ) : null}
          </Button>
          <Button type="button" variant="outline" onClick={() => onAction("import")}>
            <Upload className="size-4" />
            {t("weddingGuestsPage.actions.import")}
          </Button>
          <Button type="button" variant="primary" onClick={() => onAction("add")}>
            <Plus className="size-4" />
            {t("weddingGuestsPage.actions.add")}
          </Button>
        </div>
      )}
    />
  );
}

