"use client";

import { MoreVertical, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n/provider";
import type { WeddingCollaborator, WeddingRole } from "../types";
import { CollaboratorStats } from "./CollaboratorStats";

type PeopleWithAccessCardProps = {
  collaborators: WeddingCollaborator[];
  stats?: {
    total: number;
    editors: number;
    viewers: number;
  };
  currentUserId: string | null;
  canManageMembers: boolean;
  updatingUserId: string | null;
  removingUserId: string | null;
  onChangeRole: (userId: string, role: Extract<WeddingRole, "editor" | "viewer">) => void;
  onRemove: (collaborator: WeddingCollaborator) => void;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatAddedDate(value: string, locale: "en" | "pl") {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function PeopleWithAccessCard({
  collaborators,
  stats,
  currentUserId,
  canManageMembers,
  updatingUserId,
  removingUserId,
  onChangeRole,
  onRemove,
}: PeopleWithAccessCardProps) {
  const { t, locale } = useI18n();
  const hasOnlyOwner = collaborators.length === 1 && collaborators[0]?.role === "owner";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>{t("weddingCollaboratorsPage.people.title")}</CardTitle>
          {stats ? (
            <CollaboratorStats total={stats.total} editors={stats.editors} viewers={stats.viewers} />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {collaborators.length === 0 || hasOnlyOwner ? (
          <p className="px-6 pb-4 text-sm text-zinc-600">{t("weddingCollaboratorsPage.people.empty")}</p>
        ) : null}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("weddingCollaboratorsPage.people.columns.person")}</TableHead>
                <TableHead>{t("weddingCollaboratorsPage.people.columns.role")}</TableHead>
                <TableHead>{t("weddingCollaboratorsPage.people.columns.access")}</TableHead>
                <TableHead className="w-14 pr-6 text-right">{t("weddingCollaboratorsPage.people.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.map((collaborator) => {
              const isOwner = collaborator.role === "owner";
              const isSelf = collaborator.userId === currentUserId;
              const isUpdating = updatingUserId === collaborator.userId;
              const isRemoving = removingUserId === collaborator.userId;
              const accessLabel = isOwner || collaborator.role === "editor"
                ? t("weddingCollaboratorsPage.access.full")
                : t("weddingCollaboratorsPage.access.viewOnly");
              const addedDate = formatAddedDate(collaborator.createdAt, locale);

              return (
                <TableRow key={collaborator.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={collaborator.user.image ?? undefined} alt={collaborator.user.name} />
                        <AvatarFallback>{getInitials(collaborator.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {collaborator.user.name}
                          {isSelf ? ` (${t("weddingCollaboratorsPage.people.you")})` : ""}
                        </p>
                        <p className="truncate text-sm text-zinc-600">{collaborator.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner ? (
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                        {t("weddingCollaboratorsPage.people.ownerBadge")}
                      </Badge>
                    ) : canManageMembers ? (
                      <Select
                        value={collaborator.role}
                        onValueChange={(value) =>
                          onChangeRole(
                            collaborator.userId,
                            value as Extract<WeddingRole, "editor" | "viewer">,
                          )
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">{t("weddingCollaboratorsPage.roles.editor")}</SelectItem>
                          <SelectItem value="viewer">{t("weddingCollaboratorsPage.roles.viewer")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">
                        {t(`weddingCollaboratorsPage.roles.${collaborator.role}`)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-zinc-900">{accessLabel}</p>
                    <p className="text-sm text-zinc-600">
                      {t("weddingCollaboratorsPage.people.addedOn", { date: addedDate })}
                    </p>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {isOwner ? (
                      <ShieldCheck className="ml-auto size-4 text-violet-600" />
                    ) : canManageMembers ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100">
                          <MoreVertical className="size-4 text-zinc-600" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={isRemoving}
                            onSelect={() => onRemove(collaborator)}
                            className="text-red-600 focus:text-red-600"
                          >
                            {t("weddingCollaboratorsPage.actions.removeAccess")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
