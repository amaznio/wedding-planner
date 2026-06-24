"use client";

import { Bell, ChevronDown, Download, Mail, Plus, Upload, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/provider";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";

type GuestsPageHeaderProps = {
  notificationCount: number;
  onAction: (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => void;
  isLoading?: boolean;
};

export function GuestsPageHeader({ notificationCount, onAction, isLoading = false }: GuestsPageHeaderProps) {
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
            disabled={isLoading}
          >
            <Bell className="size-4" />
            {notificationCount > 0 ? (
              <Badge className="absolute -right-1.5 -top-1.5 min-w-5 justify-center px-1.5">
                {notificationCount}
              </Badge>
            ) : null}
          </Button>
          <Button type="button" variant="outline" onClick={() => onAction("import")} disabled={isLoading}>
            <Upload className="size-4" />
            {t("weddingGuestsPage.actions.import")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                {t("weddingGuestsPage.actions.menu")}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAction("send")}>
                <Mail className="mr-2 size-4" />
                {t("weddingGuestsPage.insights.quickActions.sendInvitations")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("reminder")}>
                <Bell className="mr-2 size-4" />
                {t("weddingGuestsPage.insights.quickActions.reminder")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("export")}>
                <Download className="mr-2 size-4" />
                {t("weddingGuestsPage.insights.quickActions.export")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("plan")}>
                <UtensilsCrossed className="mr-2 size-4" />
                {t("weddingGuestsPage.insights.quickActions.seatingPlan")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="primary" onClick={() => onAction("add")} disabled={isLoading}>
            <Plus className="size-4" />
            {t("weddingGuestsPage.actions.add")}
          </Button>
        </div>
      )}
    />
  );
}

