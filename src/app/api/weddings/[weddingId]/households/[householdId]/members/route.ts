import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { addHouseholdMemberSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; householdId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { weddingId, householdId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = addHouseholdMemberSchema.parse(body);
    const [household, guest] = await Promise.all([
      prisma.household.findFirst({
        where: { id: householdId, weddingId },
        select: { id: true },
      }),
      prisma.guest.findFirst({
        where: { id: payload.guestId, weddingId },
        select: { id: true },
      }),
    ]);
    if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });
    if (!guest) return NextResponse.json({ error: "Guest not found for wedding" }, { status: 404 });

    const member = await prisma.householdMember.create({
      data: {
        householdId,
        guestId: payload.guestId,
        role: payload.role,
      },
      include: { guest: true, household: true },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Guest is already assigned to a household" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to add household member" }, { status: 500 });
  }
}
