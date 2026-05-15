"use client";

import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DashboardTipBannerProps = {
  onAction: () => void;
};

export function DashboardTipBanner({ onAction }: DashboardTipBannerProps) {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className="border-violet-100 bg-violet-50/50">
      <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <Lightbulb className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">{t("dashboard.tip.title")}</p>
            <p className="text-sm text-violet-800">{t("dashboard.tip.description")}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="primary" onClick={onAction}>
            {t("dashboard.tip.cta")}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-violet-700"
            onClick={() => setIsVisible(false)}
            aria-label={t("dashboard.tip.dismiss")}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
