"use client";

import { Bell, Plus } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardQuickActionId } from "../types";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

type WeddingDashboardHeaderProps = {
  firstName: string;
  onQuickAction: (id: DashboardQuickActionId) => void;
  onPlaceholderAction: (id: string) => void;
};

const quickActions: DashboardQuickActionId[] = ["task", "expense", "vendor", "event", "note"];

export function WeddingDashboardHeader({
  firstName,
  onQuickAction,
  onPlaceholderAction,
}: WeddingDashboardHeaderProps) {
  const { t } = useI18n();

  return (
    <WorkspacePageHeader
      title={t("dashboard.header.greeting", { name: firstName })}
      subtitle={t("dashboard.header.subtitle")}
      actions={(
        <>
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
              <Button type="button" variant="primary" className="gap-2">
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
        </>
      )}
    />
  );
}
