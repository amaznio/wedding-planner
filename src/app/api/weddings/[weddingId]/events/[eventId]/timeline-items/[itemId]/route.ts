import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateEventTimelineItemSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; eventId: string; itemId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, eventId, itemId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateEventTimelineItemSchema.parse(body);
    const existing = await prisma.eventTimelineItem.findFirst({
      where: { id: itemId, eventId, event: { weddingId } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });

    const item = await prisma.eventTimelineItem.update({
      where: { id: itemId },
      data: {
        time: payload.time,
        title: payload.title,
        notes: payload.notes,
        sortOrder: payload.sortOrder,
        completed: payload.completed,
      },
    });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update timeline item" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, eventId, itemId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.eventTimelineItem.findFirst({
    where: { id: itemId, eventId, event: { weddingId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Timeline item not found" }, { status: 404 });

  await prisma.eventTimelineItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
