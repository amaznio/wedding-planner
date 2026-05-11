import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateHouseholdSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string; householdId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId, householdId } = await context.params;
  const household = await prisma.household.findFirst({
    where: { id: householdId, weddingId },
    include: {
      members: {
        include: { guest: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });
  return NextResponse.json({ household });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, householdId } = await context.params;
  try {
    const body = await request.json();
    const payload = updateHouseholdSchema.parse(body);
    const household = await prisma.household.findFirst({
      where: { id: householdId, weddingId },
      select: { id: true },
    });
    if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });
    const updated = await prisma.household.update({
      where: { id: householdId },
      data: {
        name: payload.name,
        notes: payload.notes,
      },
    });
    return NextResponse.json({ household: updated });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update household" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, householdId } = await context.params;
  const household = await prisma.household.findFirst({
    where: { id: householdId, weddingId },
    select: { id: true },
  });
  if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });
  await prisma.household.delete({ where: { id: householdId } });
  return NextResponse.json({ success: true });
}
