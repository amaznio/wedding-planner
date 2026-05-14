import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { addWeddingMemberSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const members = await prisma.weddingMembership.findMany({
    where: { weddingId },
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
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    currentUserId: authz.userId,
    access: authz.access,
    members: members.map((member) => ({
      id: member.id,
      weddingId: member.weddingId,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "owner");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = addWeddingMemberSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: payload.email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User with this email does not exist" },
        { status: 400 },
      );
    }

    const existingMembership = await prisma.weddingMembership.findUnique({
      where: {
        weddingId_userId: {
          weddingId,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a wedding member" }, { status: 409 });
    }

    const membership = await prisma.weddingMembership.create({
      data: {
        weddingId,
        userId: user.id,
        role: payload.role,
      },
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

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to add wedding member" }, { status: 500 });
  }
}
