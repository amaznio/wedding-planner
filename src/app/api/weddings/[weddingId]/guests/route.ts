import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingGuestSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const guests = await prisma.guest.findMany({
    where: { weddingId },
    include: {
      householdMembership: {
        include: {
          household: true,
        },
      },
      weddingGroupMemberships: {
        include: {
          group: true,
        },
      },
      eventGuests: {
        include: {
          event: {
            select: { id: true, name: true, type: true, startsAt: true },
          },
        },
      },
      relationshipMembers: {
        select: {
          relationshipId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ guests });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = createWeddingGuestSchema.parse(body);
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }
    const fallbackPlan = await prisma.seatingPlan.findFirst({
      where: {
        event: {
          weddingId,
        },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!fallbackPlan) {
      return NextResponse.json(
        { error: "Cannot create wedding guest before at least one seating plan exists for this wedding" },
        { status: 400 },
      );
    }

    const guest = await prisma.guest.create({
      data: {
        weddingId,
        planId: fallbackPlan.id,
        name: payload.name,
        sex: payload.sex,
        notes: payload.notes,
        dietaryRestrictions: payload.dietaryRestrictions,
      },
    });
    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
