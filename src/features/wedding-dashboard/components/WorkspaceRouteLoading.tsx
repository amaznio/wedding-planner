"use client";

import { useI18n } from "@/i18n/provider";

type WorkspaceRouteLoadingProps = {
  message?: string;
  maxWidthClassName?: string;
};

export function WorkspaceRouteLoading({
  message,
  maxWidthClassName = "max-w-6xl",
}: WorkspaceRouteLoadingProps) {
  const { t } = useI18n();

  return (
    <main className={`mx-auto flex w-full ${maxWidthClassName} flex-col`}>
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        {message ?? t("dashboard.states.loadingWorkspace")}
      </div>
    </main>
  );
}
