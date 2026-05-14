import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingEventSchema } from "@/features/wedding/schemas/wedding.schema";
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

  const events = await prisma.weddingEvent.findMany({
    where: { weddingId },
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
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ events });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = createWeddingEventSchema.parse(body);
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }
    const event = await prisma.weddingEvent.create({
      data: {
        weddingId,
        name: payload.name,
        type: payload.type,
        startsAt: payload.startsAt,
        location: payload.location,
        notes: payload.notes,
      },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
