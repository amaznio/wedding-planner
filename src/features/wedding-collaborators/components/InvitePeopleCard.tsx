"use client";

import { Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";
import type { SearchableUser, WeddingRole } from "../types";

type InvitePeopleCardProps = {
  canManageMembers: boolean;
  query: string;
  globalRole: Extract<WeddingRole, "editor" | "viewer">;
  selectedUserId: string | null;
  users: SearchableUser[];
  pendingInviteUserId: string | null;
  roleByUserId: Record<string, Extract<WeddingRole, "editor" | "viewer">>;
  onQueryChange: (value: string) => void;
  onGlobalRoleChange: (role: Extract<WeddingRole, "editor" | "viewer">) => void;
  onRowRoleChange: (userId: string, role: Extract<WeddingRole, "editor" | "viewer">) => void;
  onSelectedUserChange: (userId: string | null) => void;
  onInvite: (user: SearchableUser, role: Extract<WeddingRole, "editor" | "viewer">) => void;
  isSearching: boolean;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function InvitePeopleCard({
  canManageMembers,
  query,
  globalRole,
  selectedUserId,
  users,
  pendingInviteUserId,
  roleByUserId,
  onQueryChange,
  onGlobalRoleChange,
  onRowRoleChange,
  onSelectedUserChange,
  onInvite,
  isSearching,
}: InvitePeopleCardProps) {
  const { t } = useI18n();

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const selectedRole = selectedUser ? (roleByUserId[selectedUser.id] ?? globalRole) : globalRole;

  return (
    <Card id="invite-people-card">
      <CardHeader>
        <CardTitle>{t("weddingCollaboratorsPage.invite.title")}</CardTitle>
        <p className="text-sm text-zinc-600">{t("weddingCollaboratorsPage.invite.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t("weddingCollaboratorsPage.invite.searchPlaceholder")}
              disabled={!canManageMembers}
              className="pl-9"
            />
          </div>
          <Select
            value={globalRole}
            onValueChange={(value) => onGlobalRoleChange(value as Extract<WeddingRole, "editor" | "viewer">)}
            disabled={!canManageMembers}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">{t("weddingCollaboratorsPage.roles.editor")}</SelectItem>
              <SelectItem value="viewer">{t("weddingCollaboratorsPage.roles.viewer")}</SelectItem>
            </SelectContent>
          </Select>
          {canManageMembers ? (
            <Button
              type="button"
              variant="primary"
              disabled={!selectedUser || pendingInviteUserId === selectedUser.id}
              onClick={() => {
                if (!selectedUser) return;
                onInvite(selectedUser, selectedRole);
              }}
              className="md:min-w-[170px]"
            >
              {t("weddingCollaboratorsPage.actions.sendInvitation")}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button type="button" disabled className="md:min-w-[170px]">
                    {t("weddingCollaboratorsPage.actions.sendInvitation")}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t("weddingCollaboratorsPage.tooltips.ownerOnly")}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-900">{t("weddingCollaboratorsPage.invite.suggestedUsers")}</p>
          {query.trim().length < 2 ? (
            <p className="text-sm text-zinc-600">{t("weddingCollaboratorsPage.invite.tooShortQuery")}</p>
          ) : isSearching ? (
            <p className="text-sm text-zinc-600">{t("weddingCollaboratorsPage.invite.searching")}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("weddingCollaboratorsPage.invite.noUsersFound")}</p>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => {
                const rowRole = roleByUserId[user.id] ?? globalRole;
                const isPending = pendingInviteUserId === user.id;
                const isSelected = selectedUserId === user.id;
                return (
                  <li
                    key={user.id}
                    className={`flex flex-col gap-2 rounded-md border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between ${isSelected ? "ring-2 ring-violet-200" : ""}`}
                    onClick={() => onSelectedUserChange(user.id)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
                        <p className="truncate text-sm text-zinc-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={rowRole}
                        onValueChange={(value) =>
                          onRowRoleChange(user.id, value as Extract<WeddingRole, "editor" | "viewer">)
                        }
                        disabled={!canManageMembers || isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">{t("weddingCollaboratorsPage.roles.editor")}</SelectItem>
                          <SelectItem value="viewer">{t("weddingCollaboratorsPage.roles.viewer")}</SelectItem>
                        </SelectContent>
                      </Select>
                      {canManageMembers ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            onInvite(user, rowRole);
                          }}
                        >
                          {t("weddingCollaboratorsPage.actions.invite")}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
