"use client";

import { Lock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

export function AccessInfoCallout() {
  const { t } = useI18n();

  return (
    <Card className="border-violet-100 bg-violet-50/60">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <Lock className="size-4" />
        </span>
        <div>
          <p className="text-base font-semibold text-zinc-900">{t("weddingCollaboratorsPage.info.title")}</p>
          <p className="mt-1 text-sm text-zinc-700">{t("weddingCollaboratorsPage.info.description")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
