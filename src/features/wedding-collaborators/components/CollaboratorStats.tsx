"use client";

import type { ReactNode } from "react";
import { Eye, UserRoundPlus, UsersRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

type CollaboratorStatsProps = {
  total: number;
  editors: number;
  viewers: number;
};

function StatCell({
  icon,
  value,
  title,
  subtitle,
  className,
}: {
  icon: ReactNode;
  value: number;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={className ? `flex items-center gap-4 p-4 ${className}` : "flex items-center gap-4 p-4"}>
      <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>
      <div>
        <p className="text-4xl font-semibold text-zinc-900">{value}</p>
        <p className="text-base font-medium text-zinc-900">{title}</p>
        <p className="text-sm text-zinc-600">{subtitle}</p>
      </div>
    </div>
  );
}

export function CollaboratorStats({ total, editors, viewers }: CollaboratorStatsProps) {
  const { t } = useI18n();

  return (
    <Card className="grid gap-0 overflow-hidden p-0 md:grid-cols-3">
      <StatCell
        className="border-b border-zinc-200 md:border-b-0 md:border-r"
        icon={<UsersRound className="size-7" />}
        value={total}
        title={t("weddingCollaboratorsPage.stats.collaborators")}
        subtitle={t("weddingCollaboratorsPage.stats.includingYou")}
      />
      <StatCell
        className="border-b border-zinc-200 md:border-b-0 md:border-r"
        icon={<UserRoundPlus className="size-7" />}
        value={editors}
        title={t("weddingCollaboratorsPage.stats.editors")}
        subtitle={t("weddingCollaboratorsPage.stats.editorsHint")}
      />
      <StatCell
        icon={<Eye className="size-7" />}
        value={viewers}
        title={t("weddingCollaboratorsPage.stats.viewers")}
        subtitle={t("weddingCollaboratorsPage.stats.viewersHint")}
      />
    </Card>
  );
}
