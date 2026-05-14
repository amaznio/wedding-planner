import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { upsertEventGuestSchema } from "@/features/wedding/schemas/wedding.schema";
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
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const guests = await prisma.eventGuest.findMany({
    where: { eventId },
    include: { guest: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ guests });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId, eventId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const guestId = typeof body.guestId === "string" ? body.guestId : "";
    const payload = upsertEventGuestSchema.parse(body);
    if (!guestId) {
      return NextResponse.json({ error: "guestId is required" }, { status: 400 });
    }
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

    return NextResponse.json({ eventGuest }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to upsert event guest" }, { status: 500 });
  }
}
