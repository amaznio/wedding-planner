"use client";

import { Eye, UserRoundPlus, UsersRound } from "lucide-react";

import { useI18n } from "@/i18n/provider";

type CollaboratorStatsProps = {
  total: number;
  editors: number;
  viewers: number;
};

function StatChip({
  value,
  label,
  icon: Icon,
}: {
  value: number;
  label: string;
  icon: typeof UsersRound;
}) {
  return (
    <div className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[13px] leading-none text-zinc-800">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
        <Icon className="size-3" />
      </span>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function CollaboratorStats({ total, editors, viewers }: CollaboratorStatsProps) {
  const { t } = useI18n();

  return (
    <section className="flex flex-wrap items-center gap-1.5">
      <StatChip
        value={total}
        label={t("weddingCollaboratorsPage.stats.collaborators")}
        icon={UsersRound}
      />
      <StatChip
        value={editors}
        label={t("weddingCollaboratorsPage.stats.editors")}
        icon={UserRoundPlus}
      />
      <StatChip
        value={viewers}
        label={t("weddingCollaboratorsPage.stats.viewers")}
        icon={Eye}
      />
    </section>
  );
}
