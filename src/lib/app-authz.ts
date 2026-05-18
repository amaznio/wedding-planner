import type { AppRole } from "@prisma/client";
import { NextResponse } from "next/server";

import type { AuthSession } from "@/lib/auth";
import { requireAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const ROLE_RANK: Record<AppRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPERADMIN: 2,
};

function parseBootstrapSuperadmins() {
  const raw = process.env.APP_BOOTSTRAP_SUPERADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getBootstrapRole(email: string | null | undefined): AppRole | null {
  if (!email) return null;
  const configured = parseBootstrapSuperadmins();
  if (configured.has(email.trim().toLowerCase())) {
    return "SUPERADMIN";
  }
  return null;
}

function hasAtLeastRole(role: AppRole, minRole: AppRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export async function resolveAppRoleForSession(session: AuthSession): Promise<AppRole> {
  const bootstrapRole = getBootstrapRole(session.user.email);
  if (bootstrapRole) {
    return bootstrapRole;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role ?? "USER";
}

export type AppRoleAuthResult = {
  response: NextResponse | null;
  session: AuthSession | null;
  role: AppRole | null;
};

export async function requireAppRole(minRole: AppRole): Promise<AppRoleAuthResult> {
  const { session, unauthorized } = await requireAuthSession();
  if (unauthorized || !session) {
    return {
      response: unauthorized,
      session: null,
      role: null,
    };
  }

  const role = await resolveAppRoleForSession(session);
  if (!hasAtLeastRole(role, minRole)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session,
      role,
    };
  }

  return {
    response: null,
    session,
    role,
  };
}

export function hasAtLeastAppRole(role: AppRole, minRole: AppRole) {
  return hasAtLeastRole(role, minRole);
}
