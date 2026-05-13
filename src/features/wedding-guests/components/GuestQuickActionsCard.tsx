import { Bell, Download, Mail, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

type GuestQuickActionsCardProps = {
  onAction: (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => void;
};

export function GuestQuickActionsCard({ onAction }: GuestQuickActionsCardProps) {
  const { t } = useI18n();

  return (
    <Card className="gap-0 py-4">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-lg">{t("weddingGuestsPage.insights.quickActions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4">
        <Button type="button" variant="outline" className="justify-start" onClick={() => onAction("send")}>
          <Mail className="size-4" />
          {t("weddingGuestsPage.insights.quickActions.sendInvitations")}
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => onAction("reminder")}>
          <Bell className="size-4" />
          {t("weddingGuestsPage.insights.quickActions.reminder")}
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => onAction("export")}>
          <Download className="size-4" />
          {t("weddingGuestsPage.insights.quickActions.export")}
        </Button>
        <Button type="button" variant="outline" className="justify-start" onClick={() => onAction("plan")}>
          <UtensilsCrossed className="size-4" />
          {t("weddingGuestsPage.insights.quickActions.seatingPlan")}
        </Button>
      </CardContent>
    </Card>
  );
}

