"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  CheckSquare,
  Compass,
  FileText,
  HeartHandshake,
  HeartIcon,
  NotebookTabs,
  PiggyBank,
  Sparkles,
  Users,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { DashboardNavItem, DashboardNavItemId } from "../types";

type WeddingDashboardSidebarProps = {
  weddingName: string;
  weddingDateLabel: string;
  currentPath: string;
  navigation: DashboardNavItem[];
  currentUser: {
    name: string;
    email: string;
  };
  onPlaceholderAction: (id: string) => void;
};

const navIconById: Record<DashboardNavItemId, LucideIcon> = {
  home: Compass,
  schedule: CalendarDays,
  tasks: CheckSquare,
  guests: Users,
  events: UtensilsCrossed,
  budget: WalletCards,
  vendors: HeartHandshake,
  notes: NotebookTabs,
  documents: FileText,
  inspiration: Sparkles,
};

export function WeddingDashboardSidebar({
  weddingName,
  weddingDateLabel,
  currentPath,
  navigation,
  currentUser,
  onPlaceholderAction,
}: WeddingDashboardSidebarProps) {
  const { t } = useI18n();
  const normalizedPath = normalizePath(currentPath);

  return (
    <div className="flex h-screen flex-col border-r border-zinc-200 bg-white">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <HeartIcon className="size-4" />
          </div>
          <p className="text-lg font-semibold text-zinc-900">{t("dashboard.sidebar.appName")}</p>
        </div>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2.5">
          <p className="text-sm font-medium text-zinc-900">{weddingName}</p>
          <p className="text-xs text-zinc-600">{weddingDateLabel}</p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const Icon = navIconById[item.id];
            const isActive = item.href
              ? isNavigationItemActive({
                  itemId: item.id,
                  currentPath: normalizedPath,
                  href: item.href,
                })
              : false;
            const label = t(`dashboard.sidebar.nav.${item.id}`);

            if (item.href && !item.disabled) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                    isActive && "bg-violet-50 text-violet-700",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{label}</span>
                  {item.counter ? <Badge className="ml-auto bg-rose-100 text-rose-700">{item.counter}</Badge> : null}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPlaceholderAction(item.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                <Icon className="size-4" />
                <span className="truncate">{label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-500">
                  {t("dashboard.sidebar.comingSoon")}
                </span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="space-y-3 border-t border-zinc-200 p-3">
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
          <p className="text-sm font-medium text-violet-900">{t("dashboard.sidebar.duoTitle")}</p>
          <Button
            type="button"
            variant="ghost"
            className="mt-1 h-auto px-0 py-0 text-sm text-violet-700 hover:bg-transparent"
            onClick={() => onPlaceholderAction("collaboration")}
          >
            {t("dashboard.sidebar.duoAction")}
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9">
              <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{currentUser.name}</p>
              <p className="truncate text-xs text-zinc-600">{currentUser.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={t("dashboard.sidebar.profileMenu")}> 
                  <PiggyBank className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onPlaceholderAction("profile")}>{t("dashboard.sidebar.profile")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onPlaceholderAction("preferences")}>{t("dashboard.sidebar.preferences")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onPlaceholderAction("logout")}>{t("dashboard.sidebar.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function isNavigationItemActive({
  itemId,
  currentPath,
  href,
}: {
  itemId: DashboardNavItemId;
  currentPath: string;
  href: string;
}): boolean {
  const normalizedHref = normalizePath(href);
  if (itemId === "home") {
    return currentPath === normalizedHref;
  }

  if (itemId === "events") {
    const eventIndex = normalizedHref.indexOf("/events/");
    const eventsBase = eventIndex >= 0 ? normalizedHref.slice(0, eventIndex + "/events".length) : normalizedHref;
    return currentPath === eventsBase || currentPath.startsWith(`${eventsBase}/`);
  }

  return currentPath === normalizedHref || currentPath.startsWith(`${normalizedHref}/`);
}
