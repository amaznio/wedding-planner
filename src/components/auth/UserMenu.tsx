"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/i18n/provider";

export function UserMenu() {
  const router = useRouter();
  const { t } = useI18n();
  const { data: session, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (isPending || !session) {
    return null;
  }

  const userName = session.user.name?.trim() || session.user.email || t("userMenu.fallbackName");
  const userEmail = session.user.email ?? "";

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-9 gap-2 px-3 text-xs">
          <UserRound className="h-4 w-4" />
          <span className="max-w-[120px] truncate">{userName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
          <p className="truncate text-xs text-zinc-600">{userEmail}</p>
        </div>
        <DropdownMenuItem
          onClick={() => {
            router.push("/account");
          }}
          className="gap-2"
        >
          {t("userMenu.account")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleSignOut()} className="gap-2">
          {isSigningOut ? t("userMenu.signingOut") : t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
