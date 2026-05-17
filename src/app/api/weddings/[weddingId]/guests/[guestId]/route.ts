import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingGuestSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; guestId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId, guestId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, weddingId },
    include: {
      householdMembership: { include: { household: true } },
      weddingGroupMemberships: { include: { group: true } },
      eventGuests: { include: { event: true } },
    },
  });
  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  return NextResponse.json({ guest });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, guestId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingGuestSchema.parse(body);
    const guest = await prisma.guest.findFirst({
      where: { id: guestId, weddingId },
      select: { id: true },
    });
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    if (payload.guardianGuestId) {
      const guardian = await prisma.guest.findFirst({
        where: { id: payload.guardianGuestId, weddingId },
        select: { id: true },
      });
      if (!guardian) return NextResponse.json({ error: "Guardian guest not found for wedding" }, { status: 400 });
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        name: payload.name,
        sex: payload.sex,
        ageCategory: payload.ageCategory,
        guardianGuestId: payload.guardianGuestId,
        notes: payload.notes,
        dietaryRestrictions: payload.dietaryRestrictions,
      } as any,
    });
    return NextResponse.json({ guest: updated });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, guestId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, weddingId },
    select: { id: true },
  });
  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  await prisma.guest.delete({ where: { id: guestId } });
  return NextResponse.json({ success: true });
}
