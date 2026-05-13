"use client";

import { Bell, Menu, Plus } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardQuickActionId } from "../types";

type WeddingDashboardHeaderProps = {
  firstName: string;
  onOpenSidebar: () => void;
  onQuickAction: (id: DashboardQuickActionId) => void;
  onPlaceholderAction: (id: string) => void;
};

const quickActions: DashboardQuickActionId[] = ["task", "expense", "vendor", "event", "note"];

export function WeddingDashboardHeader({
  firstName,
  onOpenSidebar,
  onQuickAction,
  onPlaceholderAction,
}: WeddingDashboardHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
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
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 sm:text-3xl">
            {t("dashboard.header.greeting", { name: firstName })}
          </h1>
          <p className="text-sm text-zinc-600">{t("dashboard.header.subtitle")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("dashboard.header.notifications")}
          onClick={() => onPlaceholderAction("notifications")}
        >
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" className="gap-2 bg-violet-600 hover:bg-violet-500">
              <Plus className="size-4" />
              {t("dashboard.header.add")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {quickActions.map((action) => (
              <DropdownMenuItem key={action} onSelect={() => onQuickAction(action)}>
                {t(`dashboard.actions.${action}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
