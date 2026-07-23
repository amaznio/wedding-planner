import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingSchema } from "@/features/wedding/schemas/wedding.schema";
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

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    include: {
      events: {
        include: {
          _count: {
            select: {
              eventGuests: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          guests: true,
          vendors: true,
          expenses: true,
          households: true,
          guestGroups: true,
        },
      },
    },
  });
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }
  return NextResponse.json({ wedding, access: authz.access });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingSchema.parse(body);
    const wedding = await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        name: payload.name,
        date: payload.date,
        timezone: payload.timezone,
        location: payload.location,
        currency: payload.currency?.toUpperCase(),
        notes: payload.notes,
      },
    });
    return NextResponse.json({ wedding, access: authz.access });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update wedding" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "owner");
  if (authz.response) return authz.response;

  const existing = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }
  await prisma.wedding.delete({ where: { id: weddingId } });
  return NextResponse.json({ success: true });
}
