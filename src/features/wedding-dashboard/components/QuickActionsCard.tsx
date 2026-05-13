"use client";

import { ChevronRight, CirclePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import type { DashboardQuickActionId } from "../types";

type QuickActionsCardProps = {
  actions: DashboardQuickActionId[];
  onAction: (id: DashboardQuickActionId) => void;
};

export function QuickActionsCard({ actions, onAction }: QuickActionsCardProps) {
  const { t } = useI18n();

  return (
    <Card className="border-zinc-200/80 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("dashboard.widgets.quickActions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => onAction(action)}
          >
            <span className="flex items-center gap-2">
              <CirclePlus className="size-4 text-violet-600" />
              {t(`dashboard.actions.${action}`)}
            </span>
            <ChevronRight className="size-4 text-zinc-500" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
