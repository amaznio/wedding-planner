import type { WeddingMemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

import type { AuthSession } from "@/lib/auth";
import { getAuthSession, requireAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const ROLE_RANK: Record<WeddingMemberRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export type WeddingAccess = {
  role: WeddingMemberRole;
  canEdit: boolean;
  canManageMembers: boolean;
  canDeleteWedding: boolean;
};

type BaseAuthResult = {
  response: NextResponse | null;
  session: AuthSession | null;
  userId: string | null;
};

export type WeddingRoleAuthResult = BaseAuthResult & {
  weddingId: string | null;
  role: WeddingMemberRole | null;
  access: WeddingAccess | null;
};

export type EventRoleAuthResult = WeddingRoleAuthResult & {
  eventId: string | null;
};

export type SeatingPlanRoleAuthResult = WeddingRoleAuthResult & {
  planId: string | null;
  isStandalonePlan: boolean;
  isPublicRead: boolean;
  isPublicAccess: boolean;
  canEdit: boolean;
};

function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function notFoundResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

function hasAtLeastRole(role: WeddingMemberRole, minRole: WeddingMemberRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export function buildWeddingAccess(role: WeddingMemberRole): WeddingAccess {
  return {
    role,
    canEdit: role === "owner" || role === "editor",
    canManageMembers: role === "owner",
    canDeleteWedding: role === "owner",
  };
}

async function resolveWeddingMembershipRole(weddingId: string, userId: string) {
  const membership = await prisma.weddingMembership.findUnique({
    where: {
      weddingId_userId: {
        weddingId,
        userId,
      },
    },
    select: {
      role: true,
    },
  });

  return membership?.role ?? null;
}

export async function requireWeddingRole(
  weddingId: string,
  minRole: WeddingMemberRole,
): Promise<WeddingRoleAuthResult> {
  const { session, unauthorized } = await requireAuthSession();
  if (unauthorized || !session) {
    return {
      response: unauthorized,
      session: null,
      userId: null,
      weddingId: null,
      role: null,
      access: null,
    };
  }

  const role = await resolveWeddingMembershipRole(weddingId, session.user.id);
  if (!role) {
    return {
      response: forbiddenResponse(),
      session,
      userId: session.user.id,
      weddingId: null,
      role: null,
      access: null,
    };
  }

  if (!hasAtLeastRole(role, minRole)) {
    return {
      response: forbiddenResponse(),
      session,
      userId: session.user.id,
      weddingId,
      role,
      access: buildWeddingAccess(role),
    };
  }

  return {
    response: null,
    session,
    userId: session.user.id,
    weddingId,
    role,
    access: buildWeddingAccess(role),
  };
}

export async function requireWeddingEventRole(
  eventId: string,
  minRole: WeddingMemberRole,
): Promise<EventRoleAuthResult> {
  const { session, unauthorized } = await requireAuthSession();
  if (unauthorized || !session) {
    return {
      response: unauthorized,
      session: null,
      userId: null,
      eventId: null,
      weddingId: null,
      role: null,
      access: null,
    };
  }

  const event = await prisma.weddingEvent.findUnique({
    where: { id: eventId },
    select: { id: true, weddingId: true },
  });

  if (!event) {
    return {
      response: notFoundResponse("Wedding event not found"),
      session,
      userId: session.user.id,
      eventId: null,
      weddingId: null,
      role: null,
      access: null,
    };
  }

  const role = await resolveWeddingMembershipRole(event.weddingId, session.user.id);
  if (!role) {
    return {
      response: forbiddenResponse(),
      session,
      userId: session.user.id,
      eventId: event.id,
      weddingId: event.weddingId,
      role: null,
      access: null,
    };
  }

  if (!hasAtLeastRole(role, minRole)) {
    return {
      response: forbiddenResponse(),
      session,
      userId: session.user.id,
      eventId: event.id,
      weddingId: event.weddingId,
      role,
      access: buildWeddingAccess(role),
    };
  }

  return {
    response: null,
    session,
    userId: session.user.id,
    eventId: event.id,
    weddingId: event.weddingId,
    role,
    access: buildWeddingAccess(role),
  };
}

export async function requireSeatingPlanRole(
  planId: string,
  minRole: WeddingMemberRole,
): Promise<SeatingPlanRoleAuthResult> {
  const session = await getAuthSession();

  if (!session && minRole !== "viewer") {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      userId: null,
      planId: null,
      weddingId: null,
      role: null,
      access: null,
      isStandalonePlan: false,
      isPublicRead: false,
      isPublicAccess: false,
      canEdit: false,
    };
  }

  const plan = await prisma.seatingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      isPublicRead: true,
      event: {
        select: {
          weddingId: true,
        },
      },
    },
  });

  if (!plan) {
    return {
      response: notFoundResponse("Seating plan not found"),
      session: session ?? null,
      userId: session?.user.id ?? null,
      planId: null,
      weddingId: null,
      role: null,
      access: null,
      isStandalonePlan: false,
      isPublicRead: false,
      isPublicAccess: false,
      canEdit: false,
    };
  }

  const weddingId = plan.event?.weddingId ?? null;
  const isPublicRead = plan.isPublicRead;

  if (!session) {
    if (minRole === "viewer" && weddingId && isPublicRead) {
      return {
        response: null,
        session: null,
        userId: null,
        planId: plan.id,
        weddingId,
        role: null,
        access: null,
        isStandalonePlan: false,
        isPublicRead: true,
        isPublicAccess: true,
        canEdit: false,
      };
    }

    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
      userId: null,
      planId: null,
      weddingId: null,
      role: null,
      access: null,
      isStandalonePlan: false,
      isPublicRead,
      isPublicAccess: false,
      canEdit: false,
    };
  }

  if (!weddingId) {
    return {
      response: null,
      session,
      userId: session.user.id,
      planId: plan.id,
      weddingId: null,
      role: null,
      access: null,
      isStandalonePlan: true,
      isPublicRead,
      isPublicAccess: false,
      canEdit: true,
    };
  }

  const role = await resolveWeddingMembershipRole(weddingId, session.user.id);
  if (!role) {
    if (minRole === "viewer" && isPublicRead) {
      return {
        response: null,
        session,
        userId: session.user.id,
        planId: plan.id,
        weddingId,
        role: null,
        access: null,
        isStandalonePlan: false,
        isPublicRead,
        isPublicAccess: true,
        canEdit: false,
      };
    }

    return {
      response: forbiddenResponse(),
      session,
      userId: session.user.id,
      planId: plan.id,
      weddingId,
      role: null,
      access: null,
      isStandalonePlan: false,
      isPublicRead,
      isPublicAccess: false,
      canEdit: false,
    };
  }

  if (!hasAtLeastRole(role, minRole)) {
    return {
      response: forbiddenResponse(),
      session,
      userId: session.user.id,
      planId: plan.id,
      weddingId,
      role,
      access: buildWeddingAccess(role),
      isStandalonePlan: false,
      isPublicRead,
      isPublicAccess: false,
      canEdit: role === "owner" || role === "editor",
    };
  }

  return {
    response: null,
    session,
    userId: session.user.id,
    planId: plan.id,
    weddingId,
    role,
    access: buildWeddingAccess(role),
    isStandalonePlan: false,
    isPublicRead,
    isPublicAccess: false,
    canEdit: role === "owner" || role === "editor",
  };
}
