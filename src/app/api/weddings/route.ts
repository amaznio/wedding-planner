import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireAuthSession } from "@/lib/auth-session";
import { buildWeddingAccess } from "@/lib/wedding-authz";

export async function GET() {
  const { session, unauthorized } = await requireAuthSession();
  if (unauthorized || !session) return unauthorized;

  const weddings = await prisma.wedding.findMany({
    where: {
      memberships: {
        some: { userId: session.user.id },
      },
    },
    include: {
      _count: {
        select: {
          events: true,
          guests: true,
          vendors: true,
          expenses: true,
        },
      },
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const weddingsWithAccess = weddings.map(({ memberships, ...wedding }) => {
    const role = memberships[0]?.role ?? "viewer";
    return {
      ...wedding,
      access: buildWeddingAccess(role),
    };
  });

  return NextResponse.json({ weddings: weddingsWithAccess });
}

export async function POST(request: Request) {
  const { session, unauthorized } = await requireAuthSession();
  if (unauthorized || !session) return unauthorized;

  try {
    const body = await request.json();
    const payload = createWeddingSchema.parse(body);
    const wedding = await prisma.$transaction(async (tx) => {
      const createdWedding = await tx.wedding.create({
        data: {
          ownerId: session.user.id,
          name: payload.name,
          date: payload.date,
          timezone: payload.timezone,
          location: payload.location,
          currency: payload.currency.toUpperCase(),
          notes: payload.notes,
        },
      });

      await tx.weddingMembership.create({
        data: {
          weddingId: createdWedding.id,
          userId: session.user.id,
          role: "owner",
        },
      });

      return createdWedding;
    });
    return NextResponse.json({ wedding, access: buildWeddingAccess("owner") }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create wedding" }, { status: 500 });
  }
}
