import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, Loader2, MousePointer2, OctagonAlert, Pencil, Search, Settings } from "lucide-react";

import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CURSOR_COLOR_PRESETS, getCursorColorPreset } from "@/features/seating-editor/lib/cursor-colors";

type SeatingToolbarProps = {
  backHref: string;
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
  onPlanNameChange: (name: string) => void;
  onSave: () => void;
  onOpenPlanSettings?: () => void;
  seatSearchQuery: string;
  onSeatSearchQueryChange: (value: string) => void;
  seatSearchMeta?: {
    matchCount: number;
    hasQuery: boolean;
  };
  readOnly?: boolean;
  viewingAsLabel?: string | null;
  anonIdentity?: {
    label: string;
    nameInput: string;
    colorKey: string;
    onNameInputChange: (value: string) => void;
    onRandomize: () => void;
    onReset: () => void;
    onColorKeyChange: (value: string) => void;
  } | null;
};

export function SeatingToolbar({
  backHref,
  planName,
  isDirty,
  saveState,
  lastSavedLabel,
  onPlanNameChange,
  onSave,
  onOpenPlanSettings,
  seatSearchQuery,
  onSeatSearchQueryChange,
  seatSearchMeta,
  readOnly = false,
  viewingAsLabel = null,
  anonIdentity = null,
}: SeatingToolbarProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [isMobileEditingTitle, setIsMobileEditingTitle] = useState(false);
  const [isDesktopEditingTitle, setIsDesktopEditingTitle] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileAnonOpen, setIsMobileAnonOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const titleWidthCh = Math.max(12, Math.min(48, planName.trim().length + 2));
  const statusText =
    saveState === "saving"
      ? t("common.saving")
      : saveState === "error"
        ? t("toolbar.statusFailed")
        : isDirty
          ? t("toolbar.statusUnsaved")
          : saveState === "saved"
            ? lastSavedLabel
              ? t("toolbar.statusSavedAt", { time: lastSavedLabel })
              : t("toolbar.statusSaved")
            : null;
  const statusToneClass =
    saveState === "saving"
      ? "text-violet-600"
      : saveState === "error"
        ? "text-rose-600"
        : isDirty
          ? "text-amber-600"
          : "text-emerald-600";

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await authClient.signOut();
    setIsMobileNavOpen(false);
    router.push("/sign-in");
    router.refresh();
  };

  const anonColorPreset = getCursorColorPreset(anonIdentity?.colorKey);

  return (
    <header className="border-b border-zinc-200/90 bg-white/95 px-3 py-1.5 shadow-[0_1px_0_rgba(24,24,27,0.04)] backdrop-blur md:px-4 md:py-2">
      <div className="relative hidden h-12 items-center justify-between gap-3 md:flex">
        <div className="flex min-w-0 items-center gap-2 pr-4">
            <Button
              type="button"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-md border-zinc-200 bg-white p-0 text-zinc-700 hover:bg-zinc-50"
              onClick={() => router.push(backHref)}
              aria-label={t("toolbar.backToDashboard")}
              title={t("toolbar.backToDashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {readOnly ? (
            <p className="truncate text-[15px] font-semibold text-zinc-900">{planName}</p>
          ) : (
            <>
              {isDesktopEditingTitle ? (
                <Input
                  value={planName}
                  onChange={(event) => onPlanNameChange(event.target.value)}
                  className="h-9 rounded-md border-zinc-200 bg-zinc-50 text-[15px] font-semibold"
                  style={{ width: `${titleWidthCh}ch` }}
                  aria-label={t("toolbar.planName")}
                  autoFocus
                  onBlur={() => setIsDesktopEditingTitle(false)}
                />
              ) : (
                <p className="max-w-[44ch] truncate text-[15px] font-semibold text-zinc-900">{planName}</p>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-md border-zinc-200 bg-white p-0 text-zinc-700 hover:bg-zinc-50"
                aria-label={isDesktopEditingTitle ? t("toolbar.doneEditingTitle") : t("toolbar.editTitle")}
                title={isDesktopEditingTitle ? t("toolbar.doneEditingTitle") : t("toolbar.editTitle")}
                onClick={() => setIsDesktopEditingTitle((current) => !current)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {onOpenPlanSettings ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 w-8 rounded-md border-zinc-200 bg-white p-0 text-zinc-700 hover:bg-zinc-50"
                  aria-label={t("editor.settings")}
                  title={t("editor.settings")}
                  onClick={onOpenPlanSettings}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          )}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 px-4 lg:block">
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={seatSearchQuery}
                onChange={(event) => onSeatSearchQueryChange(event.target.value)}
                className="h-8 border-zinc-200 bg-white pl-8 text-sm"
                placeholder={t("toolbar.seatSearchPlaceholder")}
                aria-label={t("toolbar.seatSearchPlaceholder")}
              />
            </div>
            {seatSearchMeta?.hasQuery ? (
              <p className="shrink-0 text-xs font-medium text-zinc-600">
                {seatSearchMeta.matchCount > 0
                  ? t("toolbar.seatSearchMatches", { count: seatSearchMeta.matchCount })
                  : t("toolbar.seatSearchNoMatches")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={seatSearchQuery}
              onChange={(event) => onSeatSearchQueryChange(event.target.value)}
              className="h-8 border-zinc-200 bg-white pl-8 text-sm"
              placeholder={t("toolbar.seatSearchPlaceholder")}
              aria-label={t("toolbar.seatSearchPlaceholder")}
            />
          </div>
          {seatSearchMeta?.hasQuery ? (
            <p className="shrink-0 text-xs font-medium text-zinc-600">
              {seatSearchMeta.matchCount > 0
                ? t("toolbar.seatSearchMatches", { count: seatSearchMeta.matchCount })
                : t("toolbar.seatSearchNoMatches")}
            </p>
          ) : null}
        </div>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 pl-4">
          {statusText ? (
            <p className={`inline-flex items-center text-xs font-medium ${statusToneClass}`}>
              {saveState === "saving" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : saveState === "error" ? (
                <OctagonAlert className="mr-1 h-3.5 w-3.5" />
              ) : isDirty ? (
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
              ) : (
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              )}
              {statusText}
            </p>
          ) : null}
          {!readOnly ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="primary"
                  className="h-9 rounded-md px-3 text-xs font-semibold"
                  onClick={onSave}
                  disabled={saveState === "saving"}
                  aria-label={saveState === "saving" ? t("common.saving") : t("common.save")}
                >
                  {saveState === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                      <path d="M17 21v-8H7v8" />
                      <path d="M7 3v5h8" />
                    </svg>
                  )}
                  {saveState === "error" ? t("toolbar.retrySave") : t("common.save")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {saveState === "saving" ? t("common.saving") : saveState === "error" ? t("toolbar.retrySave") : t("common.save")}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {viewingAsLabel ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-semibold ${anonColorPreset.chipClass}`}
                >
                  <MousePointer2 className={anonColorPreset.markerClass} size={14} />
                  <span>{t("toolbar.viewingAs", { name: viewingAsLabel })}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px] p-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                    <MousePointer2 className={anonColorPreset.markerClass} size={16} />
                    <span className="truncate text-sm font-medium text-zinc-800">{anonIdentity?.label ?? viewingAsLabel}</span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-700">{t("toolbar.displayName")}</p>
                    <Input
                      value={anonIdentity?.nameInput ?? ""}
                      onChange={(event) => anonIdentity?.onNameInputChange(event.target.value)}
                      placeholder={anonIdentity?.label ?? viewingAsLabel}
                      className="h-8 text-sm"
                    />
                    <p className="text-[11px] text-zinc-500">{t("toolbar.displayNameHelp")}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => anonIdentity?.onRandomize()}>
                        {t("toolbar.randomizeAnon")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => anonIdentity?.onReset()}>
                        {t("toolbar.resetAnon")}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-700">{t("toolbar.cursorColor")}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {CURSOR_COLOR_PRESETS.map((preset) => {
                        const isActive = preset.key === anonIdentity?.colorKey;
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            className={`inline-flex h-8 items-center justify-center rounded-md border ${preset.chipClass} ${
                              isActive ? "ring-2 ring-zinc-300" : ""
                            }`}
                            onClick={() => anonIdentity?.onColorKeyChange(preset.key)}
                            title={preset.label}
                          >
                            <MousePointer2 className={preset.markerClass} size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500">{t("toolbar.anonSessionNotice")}</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <div className="flex h-10 items-center justify-between gap-1 px-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label={t("toolbar.backToDashboard")}
              onClick={() => router.push(backHref)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
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
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-2">
            {isMobileEditingTitle && !readOnly ? (
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
            {!readOnly ? (
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
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label={t("toolbar.seatSearchPlaceholder")}
              onClick={() => setIsMobileSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            {!readOnly ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={onSave}
                disabled={saveState === "saving"}
                aria-label={saveState === "saving" ? t("common.saving") : t("common.save")}
              >
                {saveState === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                )}
              </Button>
            ) : null}
          </div>
        </div>
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetContent side="left" showOverlay className="w-[280px] p-4 sm:max-w-[280px]">
            <SheetTitle className="text-left text-sm font-semibold text-zinc-900">
              {t("toolbar.navigation")}
            </SheetTitle>
            <div className="mt-3 space-y-2">
              {anonIdentity ? (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsMobileAnonOpen(true)}
                >
                  {t("toolbar.viewingAs", { name: anonIdentity.label })}
                </Button>
              ) : null}
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
        <Sheet open={isMobileAnonOpen} onOpenChange={setIsMobileAnonOpen}>
          <SheetContent side="bottom" className="h-auto max-h-[80dvh] p-4">
            <SheetTitle className="text-left text-sm font-semibold text-zinc-900">
              {t("toolbar.anonIdentityTitle")}
            </SheetTitle>
            <div className="mt-3 space-y-3">
              <div className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold ${anonColorPreset.chipClass}`}>
                <MousePointer2 className={anonColorPreset.markerClass} size={14} />
                <span>{t("toolbar.viewingAs", { name: anonIdentity?.label ?? "" })}</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-700">{t("toolbar.displayName")}</p>
                <Input
                  value={anonIdentity?.nameInput ?? ""}
                  onChange={(event) => anonIdentity?.onNameInputChange(event.target.value)}
                  placeholder={anonIdentity?.label ?? ""}
                />
                <p className="text-[11px] text-zinc-500">{t("toolbar.displayNameHelp")}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => anonIdentity?.onRandomize()}>
                  {t("toolbar.randomizeAnon")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => anonIdentity?.onReset()}>
                  {t("toolbar.resetAnon")}
                </Button>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-700">{t("toolbar.cursorColor")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {CURSOR_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={`inline-flex h-8 items-center justify-center rounded-md border ${preset.chipClass} ${
                        preset.key === anonIdentity?.colorKey ? "ring-2 ring-zinc-300" : ""
                      }`}
                      onClick={() => anonIdentity?.onColorKeyChange(preset.key)}
                    >
                      <MousePointer2 className={preset.markerClass} size={14} />
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">{t("toolbar.anonSessionNotice")}</p>
            </div>
          </SheetContent>
        </Sheet>
        <Sheet open={isMobileSearchOpen} onOpenChange={setIsMobileSearchOpen}>
          <SheetContent side="top" className="h-auto p-4">
            <SheetTitle className="text-left text-sm font-semibold text-zinc-900">
              {t("toolbar.seatSearchPlaceholder")}
            </SheetTitle>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={seatSearchQuery}
                  onChange={(event) => onSeatSearchQueryChange(event.target.value)}
                  className="h-9 border-zinc-200 bg-white pl-8 text-sm"
                  placeholder={t("toolbar.seatSearchPlaceholder")}
                  aria-label={t("toolbar.seatSearchPlaceholder")}
                  autoFocus
                />
              </div>
              {seatSearchMeta?.hasQuery ? (
                <p className="text-xs font-medium text-zinc-600">
                  {seatSearchMeta.matchCount > 0
                    ? t("toolbar.seatSearchMatches", { count: seatSearchMeta.matchCount })
                    : t("toolbar.seatSearchNoMatches")}
                </p>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
