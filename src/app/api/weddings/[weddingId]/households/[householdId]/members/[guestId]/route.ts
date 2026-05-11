import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateHouseholdMemberSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string; householdId: string; guestId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { weddingId, householdId, guestId } = await context.params;
  try {
    const body = await request.json();
    const payload = updateHouseholdMemberSchema.parse(body);

    const member = await prisma.householdMember.findFirst({
      where: {
        householdId,
        guestId,
        household: {
          weddingId,
        },
      },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const updated = await prisma.householdMember.update({
      where: { id: member.id },
      data: { role: payload.role },
      include: { guest: true, household: true },
    });
    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update household member" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, householdId, guestId } = await context.params;
  const member = await prisma.householdMember.findFirst({
    where: {
      householdId,
      guestId,
      household: { weddingId },
    },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  await prisma.householdMember.delete({ where: { id: member.id } });
  return NextResponse.json({ success: true });
}
