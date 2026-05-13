import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

type GuestTipCardProps = {
  onAction: (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => void;
};

export function GuestTipCard({ onAction }: GuestTipCardProps) {
  const { t } = useI18n();

  return (
    <Card className="gap-0 border-rose-100 bg-rose-50/40 py-4">
      <CardHeader className="px-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="size-4 text-rose-500" />
          {t("weddingGuestsPage.insights.tip.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <p className="text-sm text-zinc-700">{t("weddingGuestsPage.insights.tip.body")}</p>
        <Button
          type="button"
          variant="ghost"
          className="h-auto justify-start px-0 text-rose-600 hover:bg-transparent hover:text-rose-500"
          onClick={() => onAction("learn")}
        >
          {t("weddingGuestsPage.insights.tip.cta")}
        </Button>
      </CardContent>
    </Card>
  );
}

