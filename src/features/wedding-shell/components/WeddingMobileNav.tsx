"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, UtensilsCrossed, Armchair, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeddingRoutes } from "@/lib/routes";
import { useI18n } from "@/i18n/provider";

type WeddingMobileNavProps = {
  weddingId: string;
};

export function WeddingMobileNav({ weddingId }: WeddingMobileNavProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const routes = getWeddingRoutes(weddingId);

  const items = [
    { id: "home", href: routes.root, icon: LayoutGrid, label: t("dashboard.sidebar.nav.home") },
    { id: "guests", href: routes.guests, icon: Users, label: t("dashboard.sidebar.nav.guests") },
    { id: "events", href: routes.events, icon: UtensilsCrossed, label: t("dashboard.sidebar.nav.events") },
    { id: "seating", href: routes.seating, icon: Armchair, label: t("dashboard.sidebar.nav.seating") },
    { id: "budget", href: routes.budget, icon: WalletCards, label: t("dashboard.sidebar.nav.budget") },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-zinc-600",
                  isActive ? "bg-violet-50 text-violet-700" : "hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
