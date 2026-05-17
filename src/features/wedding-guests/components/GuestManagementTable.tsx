"use client";

import { useMemo, useState } from "react";
import { Filter, MessageSquare, MoreHorizontal, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n/provider";
import type { GuestRsvpStatus, WeddingGuest } from "../types";
import { GuestEventChips } from "./GuestEventChips";
import { GuestStatusBadge } from "./GuestStatusBadge";

type GuestManagementTableProps = {
  guests: WeddingGuest[];
  totalGuests: number;
  isLoading: boolean;
};

type StatusTab = "all" | GuestRsvpStatus;

type HouseholdRow = {
  id: string;
  label: string;
  initials: string;
  status: GuestRsvpStatus;
  events: WeddingGuest["events"];
  plusOne: boolean;
  notesCount: number;
  members: WeddingGuest[];
  children: WeddingGuest[];
  childNoSeatCount: number;
};

const PAGE_SIZE = 50;

export function GuestManagementTable({ guests, totalGuests, isLoading }: GuestManagementTableProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [page] = useState(1);
  const [expandedHouseholds, setExpandedHouseholds] = useState<Record<string, boolean>>({});

  const households = useMemo(() => buildHouseholds(guests), [guests]);

  const filteredHouseholds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return households.filter((household) => {
      if (statusTab !== "all" && household.status !== statusTab) return false;
      if (!query) return true;
      const haystack = [
        household.label,
        ...household.members.map((member) => member.name),
        ...household.children.map((child) => child.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [households, searchQuery, statusTab]);

  const pagedHouseholds = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredHouseholds.slice(start, start + PAGE_SIZE);
  }, [filteredHouseholds, page]);

  const displayTotal =
    searchQuery.trim() || statusTab !== "all"
      ? filteredHouseholds.length
      : Math.max(totalGuests, filteredHouseholds.length);
  const showFrom = filteredHouseholds.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showTo = filteredHouseholds.length === 0 ? 0 : Math.min(page * PAGE_SIZE, displayTotal);

  const tabs: Array<{ value: StatusTab; label: string }> = [
    { value: "all", label: t("weddingGuestsPage.filters.all") },
    { value: "confirmed", label: t("weddingGuestsPage.filters.confirmed") },
    { value: "pending", label: t("weddingGuestsPage.filters.pending") },
    { value: "not_attending", label: t("weddingGuestsPage.filters.notAttending") },
  ];

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant={statusTab === tab.value ? "primary" : "outline"}
              onClick={() => setStatusTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
              placeholder={t("weddingGuestsPage.filters.searchPlaceholder")}
            />
          </div>
          <Button type="button" variant="outline">
            <Filter className="size-4" />
            {t("weddingGuestsPage.filters.filters")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {isLoading ? (
          <p className="px-4 py-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : filteredHouseholds.length === 0 ? (
          <p className="px-4 py-4 text-sm text-zinc-500">{t("weddingGuestsPage.table.empty")}</p>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("weddingGuestsPage.table.columns.guest")}</TableHead>
                    <TableHead>{t("weddingGuestsPage.table.columns.status")}</TableHead>
                    <TableHead>{t("weddingGuestsPage.table.columns.events")}</TableHead>
                    <TableHead>{t("weddingGuestsPage.table.columns.table")}</TableHead>
                    <TableHead>{t("weddingGuestsPage.table.columns.plusOne")}</TableHead>
                    <TableHead>{t("weddingGuestsPage.table.columns.children")}</TableHead>
                    <TableHead>{t("weddingGuestsPage.table.columns.notes")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedHouseholds.map((household) => (
                    <TableRowGroup key={household.id} household={household} t={t} expanded={expandedHouseholds[household.id] === true} onToggle={() =>
                      setExpandedHouseholds((current) => ({
                        ...current,
                        [household.id]: !current[household.id],
                      }))
                    } />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 px-4 py-3 lg:hidden">
              {pagedHouseholds.map((household) => (
                <Card key={household.id} className="gap-3 py-3">
                  <CardContent className="flex flex-col gap-3 px-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback>{household.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-zinc-900">{household.label}</p>
                          <p className="text-xs text-zinc-500">
                            {household.children.length > 0
                              ? `${household.children.length} ${t("weddingGuestsPage.table.columns.children").toLowerCase()}`
                              : t("weddingGuestsPage.table.noChildren")}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" aria-label={t("weddingGuestsPage.table.rowActions")}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>{t("weddingGuestsPage.table.actions.edit")}</DropdownMenuItem>
                          <DropdownMenuItem>{t("weddingGuestsPage.table.actions.details")}</DropdownMenuItem>
                          <DropdownMenuItem>{t("weddingGuestsPage.table.actions.remove")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <GuestStatusBadge status={household.status} />
                      <span className="text-sm text-zinc-600">{household.plusOne ? "+1" : "-"}</span>
                    </div>
                    <GuestEventChips events={household.events} />
                    {household.children.length > 0 ? (
                      <div className="text-xs text-zinc-600">
                        {household.children.map((child) => (
                          <div key={`${household.id}-mobile-${child.id}`}>
                            {child.name} • {getAgeCategoryLabel(t, child.ageCategory)} •{" "}
                            {child.requiresSeat === false ? t("weddingGuestsPage.table.noSeatRequired") : "-"}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 sm:px-5">
        <p>
          {t("weddingGuestsPage.table.showing", {
            from: showFrom,
            to: showTo,
            total: displayTotal,
          })}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" disabled>
            {"<"}
          </Button>
          <Button type="button" variant="outline" className="border-violet-300 text-violet-600" disabled>
            1
          </Button>
          <Button type="button" variant="outline" disabled>
            2
          </Button>
          <Button type="button" variant="outline" disabled>
            3
          </Button>
          <Button type="button" variant="outline" size="icon" disabled>
            {">"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

type TableRowGroupProps = {
  household: HouseholdRow;
  t: (key: string, values?: Record<string, string | number>) => string;
  expanded: boolean;
  onToggle: () => void;
};

function TableRowGroup({ household, t, expanded, onToggle }: TableRowGroupProps) {
  return (
    <>
      <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>{household.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-zinc-900">{household.label}</p>
                            <p className="text-xs text-zinc-500">{household.members.length > 1 ? "Pair" : "Single guest"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GuestStatusBadge status={household.status} />
                      </TableCell>
                      <TableCell>
                        <GuestEventChips events={household.events} />
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{household.plusOne ? "+1" : "-"}</TableCell>
                      <TableCell>
                        {household.children.length > 0
                          ? `${household.children.length} (${household.childNoSeatCount} ${t("weddingGuestsPage.table.noSeatShort")})`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {household.notesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-zinc-600">
                            <MessageSquare className="size-4" />
                            {household.notesCount}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" aria-label={t("weddingGuestsPage.table.rowActions")}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>{t("weddingGuestsPage.table.actions.edit")}</DropdownMenuItem>
                            <DropdownMenuItem>{t("weddingGuestsPage.table.actions.details")}</DropdownMenuItem>
                            <DropdownMenuItem>{t("weddingGuestsPage.table.actions.remove")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
      {household.children.length > 0 && expanded ? household.children.map((child) => (
                      <TableRow key={`${household.id}-${child.id}`}>
                        <TableCell>
                          <div className="pl-12 text-sm text-zinc-700">
                            {child.name} • {getAgeCategoryLabel(t, child.ageCategory)}
                          </div>
                        </TableCell>
                        <TableCell><GuestStatusBadge status={child.status} /></TableCell>
                        <TableCell><GuestEventChips events={child.events} /></TableCell>
                        <TableCell>{child.requiresSeat === false ? t("weddingGuestsPage.table.noSeatRequired") : "-"}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{child.notesCount && child.notesCount > 0 ? child.notesCount : "-"}</TableCell>
                        <TableCell />
                      </TableRow>
                    )) : null}
      {household.children.length > 0 ? (
                      <TableRow key={`${household.id}-toggle`}>
                        <TableCell colSpan={8}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                          >
                            {expanded
                              ? t("weddingGuestsPage.table.hideChildren")
                              : t("weddingGuestsPage.table.showChildren", { count: household.children.length })}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : null}
    </>
  );
}

function buildHouseholds(guests: WeddingGuest[]): HouseholdRow[] {
  const byId = new Map(guests.map((guest) => [guest.id, guest]));
  const children = guests.filter((guest) => guest.isChild || guest.guardianGuestId);
  const adults = guests.filter((guest) => !guest.isChild && !guest.guardianGuestId);
  const visited = new Set<string>();
  const households: HouseholdRow[] = [];

  for (const adult of adults) {
    if (visited.has(adult.id)) continue;

    const linkedGuest =
      guests.find((guest) => guest.plusOneHostGuestId === adult.id) ??
      (adult.plusOneHostGuestId ? byId.get(adult.plusOneHostGuestId) : undefined);
    const members = linkedGuest && !visited.has(linkedGuest.id) ? [adult, linkedGuest] : [adult];

    members.forEach((member) => visited.add(member.id));
    const memberIds = new Set(members.map((member) => member.id));
    const householdChildren = children.filter((child) => child.guardianGuestId && memberIds.has(child.guardianGuestId));

    households.push({
      id: `household-${members.map((member) => member.id).join("-")}`,
      label: members.length === 2 ? `${members[0].name} + ${members[1].name}` : members[0].name,
      initials: members.length === 2 ? `${members[0].initials[0] ?? "?"}${members[1].initials[0] ?? "?"}` : members[0].initials,
      status: members[0].status,
      events: Array.from(new Set(members.flatMap((member) => member.events))),
      plusOne: members.length === 2,
      notesCount: members.reduce((sum, member) => sum + (member.notesCount ?? 0), 0),
      members,
      children: householdChildren,
      childNoSeatCount: householdChildren.filter((child) => child.requiresSeat === false).length,
    });
  }

  const assignedChildren = new Set(households.flatMap((household) => household.children.map((child) => child.id)));
  for (const child of children) {
    if (assignedChildren.has(child.id)) continue;
    households.push({
      id: `household-orphan-${child.id}`,
      label: child.name,
      initials: child.initials,
      status: child.status,
      events: child.events,
      plusOne: false,
      notesCount: child.notesCount ?? 0,
      members: [child],
      children: [],
      childNoSeatCount: child.requiresSeat === false ? 1 : 0,
    });
  }

  return households;
}

function getAgeCategoryLabel(t: (key: string) => string, ageCategory?: WeddingGuest["ageCategory"]): string {
  if (!ageCategory) return t("guestPanel.ageCategoryAdult");
  if (ageCategory === "adult") return t("guestPanel.ageCategoryAdult");
  if (ageCategory === "teen") return t("guestPanel.ageCategoryTeen");
  if (ageCategory === "child") return t("guestPanel.ageCategoryChild");
  if (ageCategory === "small_child") return t("guestPanel.ageCategorySmallChild");
  return t("guestPanel.ageCategoryToddler");
}
