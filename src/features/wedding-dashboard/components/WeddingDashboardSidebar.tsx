"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { authClient } from "@/lib/auth-client";
import {
  ChevronRight,
  CalendarDays,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CheckSquare,
  CreditCard,
  FileText,
  Gift,
  HeartHandshake,
  HeartIcon,
  LogOut,
  NotebookTabs,
  Settings,
  Users,
  UserRoundPlus,
  UtensilsCrossed,
  WalletCards,
  LayoutGrid,
  Armchair,
  type LucideIcon,
} from "lucide-react";
import type { DashboardNavItem, DashboardNavItemId } from "../types";

type WeddingDashboardSidebarProps = {
  currentPath: string;
  navigation: DashboardNavItem[];
  currentUser: {
    name: string;
    email: string;
    image?: string | null;
  };
  onPlaceholderAction: (id: string) => void;
};

const navIconById: Record<DashboardNavItemId, LucideIcon> = {
  home: LayoutGrid,
  tasks: CheckSquare,
  guests: Users,
  collaborators: UserRoundPlus,
  events: UtensilsCrossed,
  seating: Armchair,
  budget: WalletCards,
  vendors: HeartHandshake,
  notes: NotebookTabs,
  documents: FileText,
  settings: Settings,
};

export function WeddingDashboardSidebar({
  currentPath,
  navigation,
  currentUser,
  onPlaceholderAction,
}: WeddingDashboardSidebarProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const normalizedPath = normalizePath(currentPath);
  const { isMobile } = useSidebar();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

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
                            <Badge className="ml-auto bg-violet-100 text-violet-700 group-data-[collapsible=icon]:hidden">
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
        <Button
          type="button"
          variant="ghost"
          className="mb-3 h-auto w-full items-center justify-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3.5 py-3 text-left shadow-none hover:bg-violet-100/70 group-data-[collapsible=icon]:hidden"
          onClick={() => onPlaceholderAction("collaboration")}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-pink-500">
            <Gift className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1 pr-0.5">
            <span className="block text-sm font-semibold leading-tight text-violet-700">
              {t("dashboard.sidebar.duoTitle")}
            </span>
            <span className="mt-1 block line-clamp-2 text-xs leading-snug text-violet-600">
              {t("dashboard.sidebar.duoAction")}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-violet-400" />
        </Button>
        <div className="group-data-[collapsible=icon]:hidden">
          <p className="mb-1 text-xs font-medium text-zinc-600">{t("common.language")}</p>
          <Select value={locale} onValueChange={(value) => setLocale(value as "en" | "pl")}>
            <SelectTrigger className="w-full" aria-label={t("common.language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">{t("common.english")}</SelectItem>
              <SelectItem value="pl">{t("common.polish")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground focus-visible:ring-1 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-600"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={currentUser.image ?? undefined} alt={currentUser.name} />
                    <AvatarFallback className="rounded-lg">{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{currentUser.name}</span>
                    <span className="truncate text-xs">{currentUser.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={currentUser.image ?? undefined} alt={currentUser.name} />
                      <AvatarFallback className="rounded-lg">{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{currentUser.name}</span>
                      <span className="truncate text-xs">{currentUser.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => onPlaceholderAction("upgrade")}>
                    <CalendarDays className="mr-2 size-4" />
                    <span>{t("dashboard.sidebar.upgradePro")}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={() => {
                      router.push("/account");
                    }}
                  >
                    <BadgeCheck className="mr-2 size-4" />
                    <span>{t("dashboard.sidebar.account")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onPlaceholderAction("billing")}>
                    <CreditCard className="mr-2 size-4" />
                    <span>{t("dashboard.sidebar.billing")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onPlaceholderAction("notifications")}>
                    <Bell className="mr-2 size-4" />
                    <span>{t("dashboard.sidebar.notifications")}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isSigningOut}
                  onSelect={() => {
                    void handleSignOut();
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  <span>{isSigningOut ? t("userMenu.signingOut") : t("dashboard.sidebar.logout")}</span>
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
