import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { requireAppRole } from "@/lib/app-authz";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

const assignOwnerSchema = z.object({
  email: z.string().trim().email().max(320),
});

export async function POST(request: Request, context: RouteContext) {
  const authz = await requireAppRole("ADMIN");
  if (authz.response) return authz.response;

  const { weddingId } = await context.params;

  try {
    const body = await request.json();
    const payload = assignOwnerSchema.parse(body);

    const [wedding, user] = await Promise.all([
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { id: true, ownerId: true },
      }),
      prisma.user.findFirst({
        where: {
          email: {
            equals: payload.email,
            mode: "insensitive",
          },
        },
        select: { id: true, name: true, email: true },
      }),
    ]);

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "User with this email not found" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (wedding.ownerId && wedding.ownerId !== user.id) {
        await tx.weddingMembership.updateMany({
          where: {
            weddingId,
            userId: wedding.ownerId,
            role: "owner",
          },
          data: { role: "editor" },
        });
      }

      await tx.weddingMembership.upsert({
        where: {
          weddingId_userId: {
            weddingId,
            userId: user.id,
          },
        },
        create: {
          weddingId,
          userId: user.id,
          role: "owner",
        },
        update: {
          role: "owner",
        },
      });

      await tx.weddingMembership.updateMany({
        where: {
          weddingId,
          userId: { not: user.id },
          role: "owner",
        },
        data: {
          role: "editor",
        },
      });

      const updatedWedding = await tx.wedding.update({
        where: { id: weddingId },
        data: { ownerId: user.id },
        select: { id: true, ownerId: true, name: true },
      });

      return updatedWedding;
    });

    return NextResponse.json({
      wedding: result,
      owner: user,
    });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to assign wedding owner" }, { status: 500 });
  }
}
