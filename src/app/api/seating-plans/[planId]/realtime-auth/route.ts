import { NextResponse } from "next/server";

import { issueRealtimeToken } from "@/lib/realtime-collab-token";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { planId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "viewer");
  if (authz.response) return authz.response;

  const role = authz.role ?? (authz.isPublicAccess ? "public_viewer" : "viewer");
  const token = issueRealtimeToken({
    sub: authz.userId,
    planId,
    role,
    canEdit: authz.canEdit,
  });

  return NextResponse.json({
    token,
    planId,
    role,
    canEdit: authz.canEdit,
  });
}
