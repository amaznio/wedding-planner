import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingMemberSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { weddingId, userId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "owner");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingMemberSchema.parse(body);

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { ownerId: true },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    if (wedding.ownerId === userId) {
      return NextResponse.json(
        { error: "Owner role can only be changed through ownership transfer" },
        { status: 400 },
      );
    }

    const membership = await prisma.weddingMembership.findUnique({
      where: {
        weddingId_userId: {
          weddingId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Wedding member not found" }, { status: 404 });
    }

    const updatedMembership = await prisma.weddingMembership.update({
      where: { id: membership.id },
      data: { role: payload.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ membership: updatedMembership });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update wedding member" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, userId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "owner");
  if (authz.response) return authz.response;

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { ownerId: true },
  });

  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  if (wedding.ownerId === userId) {
    return NextResponse.json(
      { error: "Owner cannot be removed. Transfer ownership first." },
      { status: 400 },
    );
  }

  const membership = await prisma.weddingMembership.findUnique({
    where: {
      weddingId_userId: {
        weddingId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Wedding member not found" }, { status: 404 });
  }

  await prisma.weddingMembership.delete({
    where: { id: membership.id },
  });

  return NextResponse.json({ success: true });
}
