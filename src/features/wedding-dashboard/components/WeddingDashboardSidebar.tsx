"use client";

import type { CSSProperties } from "react";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
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
  currentPath,
  navigation,
  currentUser,
  onPlaceholderAction,
}: WeddingDashboardSidebarProps) {
  const { t } = useI18n();
  const normalizedPath = normalizePath(currentPath);
  const { isMobile } = useSidebar();

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      className="border-r border-zinc-200 bg-white"
      style={{ "--sidebar-width": "260px", "--sidebar-width-mobile": "320px" } as CSSProperties}
    >
      <SidebarHeader className="px-3 pb-3 pt-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-2 group-data-[collapsible=icon]:pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-auto rounded-xl px-3 py-2.5 group-data-[collapsible=icon]:mx-auto">
              <div className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <HeartIcon className="size-[18px]" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-lg font-semibold text-zinc-900">{t("dashboard.sidebar.appName")}</span>
                <span className="truncate text-sm text-zinc-600">{t("dashboard.sidebar.appTagline")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
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
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className={cn(
                          "h-10 gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 group-data-[collapsible=icon]:mx-auto",
                          isActive && "bg-violet-50 text-violet-700 hover:bg-violet-50 hover:text-violet-700",
                        )}
                      >
                        <Link href={item.href}>
                          <Icon className="size-4" />
                          <span className="truncate">{label}</span>
                          {item.counter ? (
                            <Badge className="ml-auto bg-rose-100 text-rose-700 group-data-[collapsible=icon]:hidden">
                              {item.counter}
                            </Badge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      type="button"
                      onClick={() => onPlaceholderAction(item.id)}
                      tooltip={label}
                      className="h-10 gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 group-data-[collapsible=icon]:mx-auto"
                    >
                      <Icon className="size-4" />
                      <span className="truncate">{label}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-500 group-data-[collapsible=icon]:hidden">
                        {t("dashboard.sidebar.comingSoon")}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-200 p-3 group-data-[collapsible=icon]:p-2">
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 group-data-[collapsible=icon]:hidden">
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

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="rounded-xl border border-zinc-200 bg-white p-2.5 data-[state=open]:bg-zinc-100 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
                >
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className="rounded-lg">{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-zinc-900">{currentUser.name}</span>
                    <span className="truncate text-xs text-zinc-600">{currentUser.email}</span>
                  </div>
                  <PiggyBank className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onSelect={() => onPlaceholderAction("profile")}>
                  {t("dashboard.sidebar.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onPlaceholderAction("preferences")}>
                  {t("dashboard.sidebar.preferences")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onPlaceholderAction("logout")}>
                  {t("dashboard.sidebar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
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
