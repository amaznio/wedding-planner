"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDefaultCancel,
  AlertDialogDestructiveAction,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("weddingCollaboratorsPage.removeDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {collaborator
              ? `${collaborator.user.name} (${collaborator.user.email}). ${t("weddingCollaboratorsPage.removeDialog.description")}`
              : t("weddingCollaboratorsPage.removeDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogDefaultCancel>{t("weddingCollaboratorsPage.removeDialog.cancel")}</AlertDialogDefaultCancel>
          <AlertDialogDestructiveAction onClick={() => void onConfirm()}>
            {t("weddingCollaboratorsPage.removeDialog.confirm")}
          </AlertDialogDestructiveAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
