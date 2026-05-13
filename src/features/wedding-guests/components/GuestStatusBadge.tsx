import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import type { GuestRsvpStatus } from "../types";

type GuestStatusBadgeProps = {
  status: GuestRsvpStatus;
};

export function GuestStatusBadge({ status }: GuestStatusBadgeProps) {
  const { t } = useI18n();

  const classesByStatus: Record<GuestRsvpStatus, string> = {
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    not_attending: "border-rose-200 bg-rose-50 text-rose-700",
    no_response: "border-zinc-200 bg-zinc-100 text-zinc-700",
  };

  return (
    <Badge className={cn("justify-center px-2.5 py-1 text-xs", classesByStatus[status])}>
      {t(`weddingGuestsPage.status.${status}`)}
    </Badge>
  );
}

