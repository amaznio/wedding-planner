import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingEventSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; eventId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId, eventId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, weddingId },
    include: {
      _count: {
        select: {
          eventGuests: true,
          seatingPlans: true,
          vendorEvents: true,
          expenses: true,
        },
      },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, eventId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingEventSchema.parse(body);
    const existing = await prisma.weddingEvent.findFirst({
      where: { id: eventId, weddingId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const event = await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        name: payload.name,
        type: payload.type,
        startsAt: payload.startsAt,
        location: payload.location,
        address: payload.address,
        notes: payload.notes,
      },
    });
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, eventId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.weddingEvent.findFirst({
    where: { id: eventId, weddingId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  await prisma.weddingEvent.delete({ where: { id: eventId } });
  return NextResponse.json({ success: true });
}
