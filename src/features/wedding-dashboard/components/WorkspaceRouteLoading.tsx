"use client";

import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { useI18n } from "@/i18n/provider";

type WorkspaceRouteLoadingProps = {
  message?: string;
  maxWidthClassName?: string;
};

export function WorkspaceRouteLoading({
  message,
  maxWidthClassName,
}: WorkspaceRouteLoadingProps) {
  const { t } = useI18n();

  return (
    <AppWorkspacePage className={maxWidthClassName}>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
        {message ?? t("dashboard.states.loadingWorkspace")}
      </div>
    </AppWorkspacePage>
  );
}
