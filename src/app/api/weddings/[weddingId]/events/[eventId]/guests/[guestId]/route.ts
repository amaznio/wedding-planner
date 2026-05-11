import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { upsertEventGuestSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string; eventId: string; guestId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, eventId, guestId } = await context.params;
  try {
    const body = await request.json();
    const payload = upsertEventGuestSchema.parse(body);
    const [event, guest] = await Promise.all([
      prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId }, select: { id: true } }),
      prisma.guest.findFirst({ where: { id: guestId, weddingId }, select: { id: true } }),
    ]);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!guest) return NextResponse.json({ error: "Guest not found for wedding" }, { status: 404 });

    const eventGuest = await prisma.eventGuest.upsert({
      where: { eventId_guestId: { eventId, guestId } },
      create: {
        eventId,
        guestId,
        invitationStatus: payload.invitationStatus ?? "invited",
        rsvpStatus: payload.rsvpStatus ?? "unknown",
        requiresSeat: payload.requiresSeat ?? true,
        notes: payload.notes ?? null,
      },
      update: {
        invitationStatus: payload.invitationStatus,
        rsvpStatus: payload.rsvpStatus,
        requiresSeat: payload.requiresSeat,
        notes: payload.notes,
      },
      include: { guest: true, event: true },
    });
    return NextResponse.json({ eventGuest });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update event guest" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, eventId, guestId } = await context.params;
  const event = await prisma.weddingEvent.findFirst({
    where: { id: eventId, weddingId },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  await prisma.eventGuest.deleteMany({
    where: { eventId, guestId },
  });
  return NextResponse.json({ success: true });
}
