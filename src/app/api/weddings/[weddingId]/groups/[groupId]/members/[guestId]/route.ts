import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; groupId: string; guestId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, groupId, guestId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const membership = await prisma.weddingGuestGroupMember.findFirst({
    where: {
      groupId,
      guestId,
      group: { weddingId },
    },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  await prisma.weddingGuestGroupMember.delete({ where: { id: membership.id } });
  return NextResponse.json({ success: true });
}
