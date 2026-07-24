import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createEventTimelineItemSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
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

  const items = await prisma.eventTimelineItem.findMany({
    where: { eventId },
    orderBy: [{ time: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId, eventId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = createEventTimelineItemSchema.parse(body);
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, weddingId },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const item = await prisma.eventTimelineItem.create({
      data: {
        eventId,
        time: payload.time,
        title: payload.title,
        notes: payload.notes,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create timeline item" }, { status: 500 });
  }
}
