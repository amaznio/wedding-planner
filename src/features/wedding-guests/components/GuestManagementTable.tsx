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

const PAGE_SIZE = 50;

export function GuestManagementTable({ guests, totalGuests, isLoading }: GuestManagementTableProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [page] = useState(1);

  const filteredGuests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return guests.filter((guest) => {
      if (statusTab !== "all" && guest.status !== statusTab) return false;
      if (!query) return true;
      return guest.name.toLowerCase().includes(query);
    });
  }, [guests, searchQuery, statusTab]);

  const pagedGuests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredGuests.slice(start, start + PAGE_SIZE);
  }, [filteredGuests, page]);

  const displayTotal =
    searchQuery.trim() || statusTab !== "all"
      ? filteredGuests.length
      : Math.max(totalGuests, filteredGuests.length);
  const showFrom = filteredGuests.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showTo = filteredGuests.length === 0 ? 0 : Math.min(page * PAGE_SIZE, displayTotal);

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
              variant={statusTab === tab.value ? "default" : "outline"}
              className={statusTab === tab.value ? "bg-rose-500 hover:bg-rose-400" : ""}
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
        ) : filteredGuests.length === 0 ? (
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
                    <TableHead>{t("weddingGuestsPage.table.columns.notes")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>{guest.initials}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-zinc-900">{guest.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GuestStatusBadge status={guest.status} />
                      </TableCell>
                      <TableCell>
                        <GuestEventChips events={guest.events} />
                      </TableCell>
                      <TableCell>{guest.tableNumber ?? "-"}</TableCell>
                      <TableCell>{guest.plusOne ? "+1" : "-"}</TableCell>
                      <TableCell>
                        {guest.notesCount && guest.notesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-zinc-600">
                            <MessageSquare className="size-4" />
                            {guest.notesCount}
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
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 px-4 py-3 lg:hidden">
              {pagedGuests.map((guest) => (
                <Card key={guest.id} className="gap-3 py-3">
                  <CardContent className="flex flex-col gap-3 px-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback>{guest.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-zinc-900">{guest.name}</p>
                          <p className="text-xs text-zinc-500">
                            {t("weddingGuestsPage.table.columns.table")}: {guest.tableNumber ?? "-"}
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
                      <GuestStatusBadge status={guest.status} />
                      <span className="text-sm text-zinc-600">{guest.plusOne ? "+1" : "-"}</span>
                    </div>
                    <GuestEventChips events={guest.events} />
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
          <Button type="button" variant="outline" className="border-rose-300 text-rose-600" disabled>
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
