"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useI18n } from "@/i18n/provider";
import type { WeddingCollaborator } from "../types";

type RemoveCollaboratorDialogProps = {
  collaborator: WeddingCollaborator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export function RemoveCollaboratorDialog({
  collaborator,
  open,
  onOpenChange,
  onConfirm,
}: RemoveCollaboratorDialogProps) {
  const { t } = useI18n();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("weddingCollaboratorsPage.removeDialog.title")}
      description={
        collaborator
          ? `${collaborator.user.name} (${collaborator.user.email}). ${t("weddingCollaboratorsPage.removeDialog.description")}`
          : t("weddingCollaboratorsPage.removeDialog.description")
      }
      confirmLabel={t("weddingCollaboratorsPage.removeDialog.confirm")}
      cancelLabel={t("weddingCollaboratorsPage.removeDialog.cancel")}
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  );
}
