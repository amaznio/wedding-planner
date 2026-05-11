import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createExpenseSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const expenses = await prisma.expense.findMany({
    where: { weddingId },
    include: {
      event: true,
      vendor: true,
    },
    orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ expenses });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  try {
    const body = await request.json();
    const payload = createExpenseSchema.parse(body);
    const [wedding, event, vendor] = await Promise.all([
      prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } }),
      payload.eventId
        ? prisma.weddingEvent.findFirst({
            where: { id: payload.eventId, weddingId },
            select: { id: true },
          })
        : Promise.resolve(null),
      payload.vendorId
        ? prisma.vendor.findFirst({
            where: { id: payload.vendorId, weddingId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    if (payload.eventId && !event) {
      return NextResponse.json({ error: "Event is invalid for this wedding" }, { status: 400 });
    }
    if (payload.vendorId && !vendor) {
      return NextResponse.json({ error: "Vendor is invalid for this wedding" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        weddingId,
        eventId: payload.eventId ?? null,
        vendorId: payload.vendorId ?? null,
        title: payload.title,
        category: payload.category,
        amountMinor: payload.amountMinor,
        currency: payload.currency.toUpperCase(),
        incurredAt: payload.incurredAt ?? new Date(),
        paidBy: payload.paidBy,
        notes: payload.notes,
        status: payload.status,
      },
      include: { event: true, vendor: true },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
