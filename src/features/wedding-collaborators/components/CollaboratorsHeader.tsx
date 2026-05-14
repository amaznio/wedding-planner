"use client";

import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";

type CollaboratorsHeaderProps = {
  isOwner: boolean;
  onInviteClick: () => void;
};

export function CollaboratorsHeader({ isOwner, onInviteClick }: CollaboratorsHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="px-1 py-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">{t("weddingCollaboratorsPage.title")}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {isOwner
              ? t("weddingCollaboratorsPage.subtitleOwner")
              : t("weddingCollaboratorsPage.subtitleViewer")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" aria-label={t("dashboard.header.notifications")}>
            <Bell className="size-4" />
          </Button>
          {isOwner ? (
            <Button type="button" className="bg-violet-600 text-white hover:bg-violet-500" onClick={onInviteClick}>
              <Plus className="size-4" />
              {t("weddingCollaboratorsPage.actions.invitePeople")}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button type="button" disabled className="bg-violet-300 text-white">
                    <Plus className="size-4" />
                    {t("weddingCollaboratorsPage.actions.invitePeople")}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t("weddingCollaboratorsPage.tooltips.ownerOnly")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
