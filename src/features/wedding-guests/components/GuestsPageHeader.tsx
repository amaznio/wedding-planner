"use client";

import { Bell, ChevronRight, Menu, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

type GuestsPageHeaderProps = {
  notificationCount: number;
  onOpenSidebar: () => void;
  onAction: (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => void;
};

export function GuestsPageHeader({ notificationCount, onOpenSidebar, onAction }: GuestsPageHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="flex flex-col gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenSidebar}
            aria-label={t("dashboard.header.openSidebar")}
          >
            <Menu className="size-4" />
          </Button>
          <span>{t("common.home")}</span>
          <ChevronRight className="size-4" />
          <span className="font-semibold text-zinc-800">{t("weddingGuestsPage.breadcrumb.current")}</span>
        </div>

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
          <Button type="button" className="bg-rose-500 hover:bg-rose-400" onClick={() => onAction("add")}>
            <Plus className="size-4" />
            {t("weddingGuestsPage.actions.add")}
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-semibold text-zinc-900">{t("weddingGuestsPage.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("weddingGuestsPage.subtitle")}</p>
      </div>
    </header>
  );
}

