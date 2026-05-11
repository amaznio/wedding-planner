import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

export async function GET() {
  const weddings = await prisma.wedding.findMany({
    include: {
      _count: {
        select: {
          events: true,
          guests: true,
          vendors: true,
          expenses: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ weddings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createWeddingSchema.parse(body);
    const wedding = await prisma.wedding.create({
      data: {
        name: payload.name,
        date: payload.date,
        timezone: payload.timezone,
        currency: payload.currency.toUpperCase(),
        notes: payload.notes,
      },
    });
    return NextResponse.json({ wedding }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create wedding" }, { status: 500 });
  }
}
