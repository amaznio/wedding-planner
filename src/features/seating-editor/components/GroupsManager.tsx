import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { resolveEffectiveGuestGroup } from "../lib/guest-group";

type Guest = {
  id: string;
  name: string;
  groupId: string | null;
  plusOneHostGuestId?: string | null;
  group: {
    id: string;
    name: string;
    color: string;
  } | null;
};

type GuestGroup = {
  id: string;
  planId: string;
  name: string;
  color: string;
  guestCount: number;
};

type GroupsManagerProps = {
  guests: Guest[];
  groups: GuestGroup[];
  onCreateGroup: (name: string) => Promise<GuestGroup>;
  onUpdateGroup: (
    groupId: string,
    payload: Partial<{ name: string; color: string }>,
  ) => Promise<GuestGroup>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onUpdateGuestGroup: (guestId: string, groupId: string | null) => Promise<void>;
  className?: string;
};

function getFirstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[0] ?? "";
}

function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

function sortGuestsByName(a: Guest, b: Guest, sortBy: "first" | "last"): number {
  const compare = (left: string, right: string) =>
    left.localeCompare(right, undefined, { sensitivity: "base" });

  if (sortBy === "first") {
    return (
      compare(getFirstName(a.name), getFirstName(b.name)) ||
      compare(getLastName(a.name), getLastName(b.name)) ||
      compare(a.name, b.name)
    );
  }

  return (
    compare(getLastName(a.name), getLastName(b.name)) ||
    compare(getFirstName(a.name), getFirstName(b.name)) ||
    compare(a.name, b.name)
  );
}

export function GroupsManager({
  guests,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateGuestGroup,
  className,
}: GroupsManagerProps) {
  const { t } = useI18n();
  const [newGroupName, setNewGroupName] = useState("");
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [groupActionError, setGroupActionError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [isGroupNameSaving, setIsGroupNameSaving] = useState(false);
  const [guestMembershipActionGuestId, setGuestMembershipActionGuestId] = useState<string | null>(null);
  const [addGuestsQuery, setAddGuestsQuery] = useState("");
  const [addGuestsSortBy, setAddGuestsSortBy] = useState<"first" | "last">("first");
  const [isMembersExpanded, setIsMembersExpanded] = useState(true);
  const [isAddGuestsExpanded, setIsAddGuestsExpanded] = useState(true);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  const guestsById = useMemo<Record<string, Guest>>(
    () => Object.fromEntries(guests.map((guest) => [guest.id, guest])),
    [guests],
  );

  const guestCountByGroupId = useMemo(() => {
    const next: Record<string, number> = {};
    for (const guest of guests) {
      const effectiveGroup = resolveEffectiveGuestGroup(guest, guestsById);
      if (!effectiveGroup) continue;
      next[effectiveGroup.id] = (next[effectiveGroup.id] ?? 0) + 1;
    }
    return next;
  }, [guests, guestsById]);

  const guestsInSelectedGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    return guests
      .filter(
        (guest) => resolveEffectiveGuestGroup(guest, guestsById)?.id === selectedGroupId,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guests, guestsById, selectedGroupId]);

  const guestsOutsideSelectedGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    const query = addGuestsQuery.trim().toLowerCase();
    return guests
      .filter(
        (guest) => resolveEffectiveGuestGroup(guest, guestsById)?.id !== selectedGroupId,
      )
      .filter((guest) =>
        query.length === 0 ? true : guest.name.toLowerCase().includes(query),
      )
      .sort((a, b) => sortGuestsByName(a, b, addGuestsSortBy));
  }, [addGuestsQuery, addGuestsSortBy, guests, guestsById, selectedGroupId]);

  const totalOutsideSelectedGroup = useMemo(() => {
    if (!selectedGroupId) return 0;
    return guests.filter(
      (guest) => resolveEffectiveGuestGroup(guest, guestsById)?.id !== selectedGroupId,
    ).length;
  }, [guests, guestsById, selectedGroupId]);

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setGroupActionError(null);
    setIsGroupSubmitting(true);
    try {
      const createdGroup = await onCreateGroup(trimmed);
      setNewGroupName("");
      setSelectedGroupId(createdGroup.id);
      setGroupNameDraft(createdGroup.name);
    } catch (error) {
      setGroupActionError(
        error instanceof Error ? error.message : t("guestPanel.groupCreateFailed"),
      );
    } finally {
      setIsGroupSubmitting(false);
    }
  };

  const handleSaveSelectedGroupName = async () => {
    if (!selectedGroup) return;
    const trimmed = groupNameDraft.trim();
    if (!trimmed || trimmed === selectedGroup.name) return;
    setGroupActionError(null);
    setIsGroupNameSaving(true);
    try {
      await onUpdateGroup(selectedGroup.id, { name: trimmed });
    } catch (error) {
      setGroupActionError(
        error instanceof Error ? error.message : t("guestPanel.groupUpdateFailed"),
      );
    } finally {
      setIsGroupNameSaving(false);
    }
  };

  const handleRecolorGroup = async (groupId: string, color: string) => {
    setGroupActionError(null);
    try {
      await onUpdateGroup(groupId, { color });
    } catch (error) {
      setGroupActionError(
        error instanceof Error ? error.message : t("guestPanel.groupUpdateFailed"),
      );
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const accepted = window.confirm(t("guestPanel.groupDeleteConfirm", { name: groupName }));
    if (!accepted) return;
    setGroupActionError(null);
    try {
      await onDeleteGroup(groupId);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setGroupNameDraft("");
      }
    } catch (error) {
      setGroupActionError(
        error instanceof Error ? error.message : t("guestPanel.groupDeleteFailed"),
      );
    }
  };

  const handleUpdateGuestMembership = async (guestId: string, groupId: string | null) => {
    setGroupActionError(null);
    setGuestMembershipActionGuestId(guestId);
    try {
      await onUpdateGuestGroup(guestId, groupId);
    } catch (error) {
      setGroupActionError(
        error instanceof Error ? error.message : t("guestPanel.groupUpdateFailed"),
      );
    } finally {
      setGuestMembershipActionGuestId(null);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {!selectedGroup ? (
          <div className="flex gap-2">
            <Input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder={t("guestPanel.addGroupPlaceholder")}
            />
            <Button
              type="button"
              size="sm"
              disabled={isGroupSubmitting}
              onClick={() => void handleCreateGroup()}
            >
              {t("common.add")}
            </Button>
          </div>
        ) : null}

        {groupActionError ? <p className="text-xs text-red-700">{groupActionError}</p> : null}

        {selectedGroup ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setSelectedGroupId(null)}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t("guestPanel.backToGroups")}
            </Button>

            <div className="divide-y divide-zinc-200">
              <section className="space-y-3 pb-4">
                <p className="text-xs font-medium text-zinc-500">{t("guestPanel.groupName")}</p>
                <div className="flex gap-2">
                  <Input
                    value={groupNameDraft}
                    onChange={(event) => setGroupNameDraft(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isGroupNameSaving}
                    onClick={() => void handleSaveSelectedGroupName()}
                  >
                    {t("common.save")}
                  </Button>
                </div>
              </section>

              <section className="space-y-3 py-4">
                <p className="text-xs font-medium text-zinc-500">{t("guestPanel.groupColor")}</p>
                <input
                  type="color"
                  value={selectedGroup.color}
                  className="h-9 w-14 rounded border border-zinc-300 bg-white p-0"
                  aria-label={t("guestPanel.groupColor")}
                  onChange={(event) => {
                    void handleRecolorGroup(selectedGroup.id, event.target.value);
                  }}
                />
              </section>

              <section className="space-y-3 py-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm py-1 text-left"
                  onClick={() => setIsMembersExpanded((current) => !current)}
                >
                  <span className="text-sm font-semibold text-zinc-900">
                    {t("guestPanel.groupMembersTitle")} ({guestsInSelectedGroup.length})
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 text-zinc-500 transition-transform ${isMembersExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isMembersExpanded ? (
                  guestsInSelectedGroup.length === 0 ? (
                    <p className="text-xs text-zinc-500">{t("guestPanel.groupMembersEmpty")}</p>
                  ) : (
                    <div className="space-y-2">
                      {guestsInSelectedGroup.map((guest) => (
                        <div
                          key={guest.id}
                          className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-2 py-1.5"
                        >
                          <p className="min-w-0 truncate text-sm text-zinc-800">{guest.name}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={guestMembershipActionGuestId === guest.id}
                            onClick={() => void handleUpdateGuestMembership(guest.id, null)}
                          >
                            {t("guestPanel.removeFromGroup")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </section>

              <section className="space-y-3 pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm py-1 text-left"
                  onClick={() => setIsAddGuestsExpanded((current) => !current)}
                >
                  <span className="text-sm font-semibold text-zinc-900">
                    {t("guestPanel.groupAddGuestsTitle")} ({totalOutsideSelectedGroup})
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 text-zinc-500 transition-transform ${isAddGuestsExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isAddGuestsExpanded ? (
                  <>
                    <div className="space-y-2">
                      <Input
                        value={addGuestsQuery}
                        onChange={(event) => setAddGuestsQuery(event.target.value)}
                        placeholder={t("guestPanel.groupGuestSearchPlaceholder")}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={addGuestsSortBy === "first" ? "default" : "outline"}
                          onClick={() => setAddGuestsSortBy("first")}
                        >
                          {t("guestPanel.sortFirstName")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={addGuestsSortBy === "last" ? "default" : "outline"}
                          onClick={() => setAddGuestsSortBy("last")}
                        >
                          {t("guestPanel.sortLastName")}
                        </Button>
                      </div>
                    </div>
                    {totalOutsideSelectedGroup === 0 ? (
                      <p className="text-xs text-zinc-500">{t("guestPanel.groupAddGuestsEmpty")}</p>
                    ) : guestsOutsideSelectedGroup.length === 0 ? (
                      <p className="text-xs text-zinc-500">{t("guestPanel.groupGuestSearchNoResults")}</p>
                    ) : (
                      <div className="space-y-2">
                        {guestsOutsideSelectedGroup.map((guest) => (
                          <div
                            key={guest.id}
                            className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-2 py-1.5"
                          >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-zinc-800">{guest.name}</p>
                        </div>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={guestMembershipActionGuestId === guest.id}
                              onClick={() => void handleUpdateGuestMembership(guest.id, selectedGroup.id)}
                            >
                              {t("common.add")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </section>
            </div>
          </div>
        ) : groups.length > 0 ? (
          <div className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
            {groups.map((group) => {
              const groupedCount = guestCountByGroupId[group.id] ?? 0;
              return (
                <div
                  key={group.id}
                  className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-zinc-50"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left"
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setGroupNameDraft(group.name);
                    }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-300"
                      style={{ backgroundColor: group.color }}
                    />
                    <p className="min-w-0 truncate text-sm text-zinc-800">
                      {group.name} ({groupedCount})
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-700 hover:bg-red-50"
                    onClick={() => void handleDeleteGroup(group.id, group.name)}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">{t("guestPanel.groupsEmpty")}</p>
        )}
      </div>
    </div>
  );
}
