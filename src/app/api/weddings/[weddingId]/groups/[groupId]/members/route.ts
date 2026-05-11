import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { addWeddingGroupMemberSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string; groupId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { weddingId, groupId } = await context.params;
  try {
    const body = await request.json();
    const payload = addWeddingGroupMemberSchema.parse(body);
    const [group, guest] = await Promise.all([
      prisma.weddingGuestGroup.findFirst({
        where: { id: groupId, weddingId },
        select: { id: true },
      }),
      prisma.guest.findFirst({
        where: { id: payload.guestId, weddingId },
        select: { id: true },
      }),
    ]);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (!guest) return NextResponse.json({ error: "Guest not found for wedding" }, { status: 404 });

    const membership = await prisma.weddingGuestGroupMember.create({
      data: {
        groupId,
        guestId: payload.guestId,
      },
      include: { group: true, guest: true },
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Guest is already in this group" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add group member" }, { status: 500 });
  }
}
