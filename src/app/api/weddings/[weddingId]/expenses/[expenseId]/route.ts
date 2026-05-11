import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateExpenseSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string; expenseId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId, expenseId } = await context.params;
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, weddingId },
    include: { event: true, vendor: true },
  });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, expenseId } = await context.params;
  try {
    const body = await request.json();
    const payload = updateExpenseSchema.parse(body);
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, weddingId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    if (payload.eventId) {
      const event = await prisma.weddingEvent.findFirst({
        where: { id: payload.eventId, weddingId },
        select: { id: true },
      });
      if (!event) return NextResponse.json({ error: "Event is invalid for this wedding" }, { status: 400 });
    }
    if (payload.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: payload.vendorId, weddingId },
        select: { id: true },
      });
      if (!vendor) return NextResponse.json({ error: "Vendor is invalid for this wedding" }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        title: payload.title,
        category: payload.category,
        amountMinor: payload.amountMinor,
        currency: payload.currency?.toUpperCase(),
        incurredAt: payload.incurredAt,
        paidBy: payload.paidBy,
        notes: payload.notes,
        status: payload.status,
        eventId: payload.eventId,
        vendorId: payload.vendorId,
      },
      include: { event: true, vendor: true },
    });
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, expenseId } = await context.params;
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, weddingId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ success: true });
}
