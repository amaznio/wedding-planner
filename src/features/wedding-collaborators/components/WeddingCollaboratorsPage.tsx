"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { useI18n } from "@/i18n/provider";
import type { SearchableUser, WeddingAccess, WeddingCollaborator, WeddingRole } from "../types";
import { AccessInfoCallout } from "./AccessInfoCallout";
import { CollaboratorsHeader } from "./CollaboratorsHeader";
import { InvitePeopleCard } from "./InvitePeopleCard";
import { PeopleWithAccessCard } from "./PeopleWithAccessCard";
import { RemoveCollaboratorDialog } from "./RemoveCollaboratorDialog";
import { WorkspaceManagementPageLoading } from "@/features/wedding-dashboard/components/WorkspacePageLoading";

type WeddingCollaboratorsPageProps = {
  weddingId: string;
};

type MembersResponse = {
  currentUserId: string | null;
  access: WeddingAccess;
  members: WeddingCollaborator[];
};

type WeddingMemberRole = Extract<WeddingRole, "editor" | "viewer">;

export function WeddingCollaboratorsPage({ weddingId }: WeddingCollaboratorsPageProps) {
  const { t } = useI18n();
  const [collaborators, setCollaborators] = useState<WeddingCollaborator[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<WeddingAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchUsers, setSearchUsers] = useState<SearchableUser[]>([]);
  const [selectedInviteUserId, setSelectedInviteUserId] = useState<string | null>(null);
  const [globalInviteRole, setGlobalInviteRole] = useState<WeddingMemberRole>("viewer");
  const [inviteRoleByUserId, setInviteRoleByUserId] = useState<Record<string, WeddingMemberRole>>({});

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [pendingInviteUserId, setPendingInviteUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WeddingCollaborator | null>(null);

  const canManageMembers = access?.canManageMembers ?? false;

  const loadMembers = useCallback(async () => {
    const response = await fetch(`/api/weddings/${weddingId}/members`, { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    const json = (await response.json()) as MembersResponse;
    setCollaborators(json.members ?? []);
    setCurrentUserId(json.currentUserId ?? null);
    setAccess(json.access ?? null);
  }, [weddingId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await loadMembers();
      } catch {
        if (active) setError(t("weddingCollaboratorsPage.errors.load"));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [loadMembers, t]);

  useEffect(() => {
    let active = true;
    const trimmedQuery = query.trim();

    const run = async () => {
      if (!canManageMembers || trimmedQuery.length < 2) {
        if (!active) return;
        setSearchUsers([]);
        setSelectedInviteUserId(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!active) return;

      try {
        const response = await fetch(
          `/api/weddings/${weddingId}/members/search-users?q=${encodeURIComponent(trimmedQuery)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("search_failed");

        const json = (await response.json()) as { users: SearchableUser[] };
        if (!active) return;
        setSearchUsers(json.users ?? []);
        setSelectedInviteUserId((prev) => {
          if (prev && (json.users ?? []).some((user) => user.id === prev)) return prev;
          return (json.users ?? [])[0]?.id ?? null;
        });
      } catch {
        if (active) {
          setSearchUsers([]);
          setSelectedInviteUserId(null);
          setError(t("weddingCollaboratorsPage.errors.search"));
        }
      } finally {
        if (active) setIsSearching(false);
      }
    };
    void run();

    return () => {
      active = false;
    };
  }, [canManageMembers, query, t, weddingId]);

  const stats = useMemo(() => {
    const editors = collaborators.filter((member) => member.role === "editor").length;
    const viewers = collaborators.filter((member) => member.role === "viewer").length;
    return {
      total: collaborators.length,
      editors,
      viewers,
    };
  }, [collaborators]);

  const inviteUser = useCallback(async (user: SearchableUser, role: WeddingMemberRole) => {
    setPendingInviteUserId(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          role,
        }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "invite_failed");
      }

      await loadMembers();
      setSearchUsers((prev) => prev.filter((candidate) => candidate.id !== user.id));
      if (selectedInviteUserId === user.id) {
        setSelectedInviteUserId(null);
      }
    } catch {
      setError(t("weddingCollaboratorsPage.errors.invite"));
    } finally {
      setPendingInviteUserId(null);
    }
  }, [loadMembers, selectedInviteUserId, t, weddingId]);

  const updateRole = useCallback(async (userId: string, role: WeddingMemberRole) => {
    setUpdatingUserId(userId);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("role_update_failed");
      await loadMembers();
    } catch {
      setError(t("weddingCollaboratorsPage.errors.roleUpdate"));
    } finally {
      setUpdatingUserId(null);
    }
  }, [loadMembers, t, weddingId]);

  const removeCollaborator = useCallback(async () => {
    if (!removeTarget) return;
    setRemovingUserId(removeTarget.userId);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/members/${removeTarget.userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("remove_failed");
      await loadMembers();
      setRemoveTarget(null);
    } catch {
      setError(t("weddingCollaboratorsPage.errors.remove"));
    } finally {
      setRemovingUserId(null);
    }
  }, [loadMembers, removeTarget, t, weddingId]);

  if (isLoading) {
    return (
      <WorkspaceManagementPageLoading
        title={t("weddingCollaboratorsPage.title")}
        subtitle={t("weddingCollaboratorsPage.subtitleOwner")}
        content="panels"
        showFilters={false}
      />
    );
  }

  return (
    <AppWorkspacePage>
      <CollaboratorsHeader />

      <div className="mt-5 flex flex-col gap-5">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!canManageMembers ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {t("weddingCollaboratorsPage.readOnlyBanner")}
          </div>
        ) : null}

        <PeopleWithAccessCard
          collaborators={collaborators}
          stats={stats}
          currentUserId={currentUserId}
          canManageMembers={canManageMembers}
          updatingUserId={updatingUserId}
          removingUserId={removingUserId}
          onChangeRole={(userId, role) => {
            void updateRole(userId, role);
          }}
          onRemove={(collaborator) => setRemoveTarget(collaborator)}
        />
        <InvitePeopleCard
          canManageMembers={canManageMembers}
          query={query}
          globalRole={globalInviteRole}
          selectedUserId={selectedInviteUserId}
          users={searchUsers}
          pendingInviteUserId={pendingInviteUserId}
          roleByUserId={inviteRoleByUserId}
          onQueryChange={setQuery}
          onGlobalRoleChange={setGlobalInviteRole}
          onRowRoleChange={(userId, role) =>
            setInviteRoleByUserId((prev) => ({ ...prev, [userId]: role }))
          }
          onSelectedUserChange={setSelectedInviteUserId}
          onInvite={(user, role) => {
            void inviteUser(user, role);
          }}
          isSearching={isSearching}
        />
        <AccessInfoCallout />
      </div>

      <RemoveCollaboratorDialog
        collaborator={removeTarget}
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onConfirm={removeCollaborator}
      />
    </AppWorkspacePage>
  );
}
