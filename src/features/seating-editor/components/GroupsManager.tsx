import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";

type Guest = {
  id: string;
  groupId: string | null;
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
  className?: string;
};

export function GroupsManager({
  guests,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  className,
}: GroupsManagerProps) {
  const { t } = useI18n();
  const [newGroupName, setNewGroupName] = useState("");
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [groupActionError, setGroupActionError] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setGroupActionError(null);
    setIsGroupSubmitting(true);
    try {
      await onCreateGroup(trimmed);
      setNewGroupName("");
    } catch (error) {
      setGroupActionError(error instanceof Error ? error.message : t("guestPanel.groupCreateFailed"));
    } finally {
      setIsGroupSubmitting(false);
    }
  };

  const handleRenameGroup = async (groupId: string, currentName: string) => {
    const nextName = window.prompt(t("guestPanel.groupRenamePrompt"), currentName);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === currentName) return;
    setGroupActionError(null);
    try {
      await onUpdateGroup(groupId, { name: trimmed });
    } catch (error) {
      setGroupActionError(error instanceof Error ? error.message : t("guestPanel.groupUpdateFailed"));
    }
  };

  const handleRecolorGroup = async (groupId: string, color: string) => {
    setGroupActionError(null);
    try {
      await onUpdateGroup(groupId, { color });
    } catch (error) {
      setGroupActionError(error instanceof Error ? error.message : t("guestPanel.groupUpdateFailed"));
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const accepted = window.confirm(t("guestPanel.groupDeleteConfirm", { name: groupName }));
    if (!accepted) return;
    setGroupActionError(null);
    try {
      await onDeleteGroup(groupId);
    } catch (error) {
      setGroupActionError(error instanceof Error ? error.message : t("guestPanel.groupDeleteFailed"));
    }
  };

  return (
    <div className={className}>
      <div className="space-y-3">
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
        {groupActionError ? <p className="text-xs text-red-700">{groupActionError}</p> : null}
        {groups.length > 0 ? (
          <div className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
            {groups.map((group) => {
              const groupedCount = guests.filter((guest) => guest.groupId === group.id).length;
              return (
                <div key={group.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-300"
                    style={{ backgroundColor: group.color }}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                    {group.name} ({groupedCount})
                  </p>
                  <input
                    type="color"
                    value={group.color}
                    className="h-7 w-9 rounded border border-zinc-300 bg-white p-0"
                    aria-label={t("guestPanel.groupColor")}
                    onChange={(event) => {
                      void handleRecolorGroup(group.id, event.target.value);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => void handleRenameGroup(group.id, group.name)}
                  >
                    {t("guestPanel.rename")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-700"
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
