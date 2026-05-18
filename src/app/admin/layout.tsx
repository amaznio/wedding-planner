import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAuthSession } from "@/lib/auth-session";
import { hasAtLeastAppRole, resolveAppRoleForSession } from "@/lib/app-authz";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/");
  }

  const role = await resolveAppRoleForSession(session);
  if (!hasAtLeastAppRole(role, "ADMIN")) {
    redirect("/");
  }

  return <>{children}</>;
}
