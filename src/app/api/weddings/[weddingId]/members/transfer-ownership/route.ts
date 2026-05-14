import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { transferWeddingOwnershipSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

class TransferOwnershipError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "owner");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = transferWeddingOwnershipSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const wedding = await tx.wedding.findUnique({
        where: { id: weddingId },
        select: { id: true, ownerId: true },
      });

      if (!wedding) {
        throw new TransferOwnershipError("Wedding not found", 404);
      }

      if (!wedding.ownerId) {
        throw new TransferOwnershipError("Wedding owner is not configured", 409);
      }

      const [currentOwnerMembership, targetMembership] = await Promise.all([
        tx.weddingMembership.findUnique({
          where: {
            weddingId_userId: {
              weddingId,
              userId: wedding.ownerId,
            },
          },
          select: { id: true, userId: true, role: true },
        }),
        tx.weddingMembership.findUnique({
          where: {
            weddingId_userId: {
              weddingId,
              userId: payload.userId,
            },
          },
          select: { id: true, userId: true, role: true },
        }),
      ]);

      if (!currentOwnerMembership || currentOwnerMembership.role !== "owner") {
        throw new TransferOwnershipError("Wedding owner membership is inconsistent", 409);
      }

      if (!targetMembership) {
        throw new TransferOwnershipError("Target member not found", 404);
      }

      if (targetMembership.userId === wedding.ownerId) {
        return {
          ownerId: wedding.ownerId,
          transferred: false,
        };
      }

      await tx.weddingMembership.update({
        where: { id: currentOwnerMembership.id },
        data: { role: "editor" },
      });

      await tx.weddingMembership.update({
        where: { id: targetMembership.id },
        data: { role: "owner" },
      });

      await tx.wedding.update({
        where: { id: weddingId },
        data: { ownerId: targetMembership.userId },
      });

      return {
        ownerId: targetMembership.userId,
        transferred: true,
      };
    });

    return NextResponse.json({
      success: true,
      transferred: result.transferred,
      ownerId: result.ownerId,
    });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof TransferOwnershipError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
  }
}
