import { useState } from "react";
import { useRouter } from "next/navigation";

import { UserMenu } from "@/components/auth/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";

type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
  onPlanNameChange: (name: string) => void;
  onSave: () => void;
  onOpenPlanSettings?: () => void;
};

export function SeatingToolbar({
  planName,
  isDirty,
  saveState,
  lastSavedLabel,
  onPlanNameChange,
  onSave,
  onOpenPlanSettings,
}: SeatingToolbarProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [isMobileEditingTitle, setIsMobileEditingTitle] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const titleWidthCh = Math.max(12, Math.min(48, planName.trim().length + 2));
  const statusText =
    saveState === "saving"
      ? t("common.saving")
      : saveState === "error"
        ? t("toolbar.statusFailed")
        : isDirty
          ? t("toolbar.statusUnsaved")
          : lastSavedLabel
            ? t("toolbar.statusSavedAt", { time: lastSavedLabel })
            : t("toolbar.statusSaved");

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await authClient.signOut();
    setIsMobileNavOpen(false);
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <header className="border-b border-zinc-200 bg-white px-3 py-1.5 md:px-4 md:py-2">
      <div className="hidden h-12 items-center md:flex">
        <div className="flex min-w-0 items-center gap-2">
          <Input
            value={planName}
            onChange={(event) => onPlanNameChange(event.target.value)}
            className="h-9 border-transparent bg-zinc-50 text-base font-semibold"
            style={{ width: `${titleWidthCh}ch` }}
            aria-label={t("toolbar.planName")}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-xs"
                onClick={onSave}
                disabled={saveState === "saving"}
                aria-label={saveState === "saving" ? t("common.saving") : t("common.save")}
              >
                <svg viewBox="0 0 24 24" className="mr-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                  <path d="M17 21v-8H7v8" />
                  <path d="M7 3v5h8" />
                </svg>
                {t("common.save")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {saveState === "saving" ? t("common.saving") : t("common.save")}
            </TooltipContent>
          </Tooltip>
          <Badge variant="secondary" className="h-6 px-2 text-[11px]">
            {statusText}
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onOpenPlanSettings ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={onOpenPlanSettings}
            >
              {t("editor.settings")}
            </Button>
          ) : null}
          <Select value={locale} onValueChange={(value) => setLocale(value as "en" | "pl")}>
            <SelectTrigger className="h-9 w-[150px]" aria-label={t("common.language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("common.english")}</SelectItem>
              <SelectItem value="pl">{t("common.polish")}</SelectItem>
            </SelectContent>
          </Select>
          <UserMenu />
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex h-10 items-center justify-between px-1">
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={t("toolbar.menu")}
            onClick={() => setIsMobileNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-2">
            {isMobileEditingTitle ? (
              <Input
                value={planName}
                onChange={(event) => onPlanNameChange(event.target.value)}
                className="h-8 w-[170px] max-w-[48vw] border-transparent bg-zinc-50 text-sm font-semibold"
                aria-label={t("toolbar.planName")}
              />
            ) : (
              <p className="truncate text-sm font-semibold text-zinc-900">
                {planName}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 p-0"
              aria-label={
                isMobileEditingTitle ? t("toolbar.doneEditingTitle") : t("toolbar.editTitle")
              }
              onClick={() => setIsMobileEditingTitle((current) => !current)}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onSave}
              disabled={saveState === "saving"}
              aria-label={saveState === "saving" ? t("common.saving") : t("common.save")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </Button>
          </div>
        </div>
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetContent side="left" showOverlay className="w-[280px] p-4 sm:max-w-[280px]">
            <SheetTitle className="text-left text-sm font-semibold text-zinc-900">
              {t("toolbar.navigation")}
            </SheetTitle>
            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  router.push("/");
                }}
              >
                {t("common.home")}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  router.push("/seating-plans");
                }}
              >
                {t("toolbar.seatingPlans")}
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                {t("toolbar.currentPlan")}
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {session ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      router.push("/account");
                    }}
                  >
                    {t("userMenu.account")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? t("userMenu.signingOut") : t("userMenu.signOut")}
                  </Button>
                </>
              ) : null}
              <p className="text-xs font-medium text-zinc-600">{t("common.language")}</p>
              <Select value={locale} onValueChange={(value) => setLocale(value as "en" | "pl")}>
                <SelectTrigger className="w-full" aria-label={t("common.language")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("common.english")}</SelectItem>
                  <SelectItem value="pl">{t("common.polish")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
