import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createVendorSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const vendors = await prisma.vendor.findMany({
    where: { weddingId },
    include: {
      vendorEvents: {
        include: {
          event: true,
        },
      },
      expenses: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ vendors });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  try {
    const body = await request.json();
    const payload = createVendorSchema.parse(body);
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

    const eventSet = new Set(payload.eventIds);
    if (eventSet.size !== payload.eventIds.length) {
      return NextResponse.json({ error: "Duplicate eventIds are not allowed" }, { status: 400 });
    }
    if (payload.eventIds.length > 0) {
      const events = await prisma.weddingEvent.findMany({
        where: { id: { in: payload.eventIds }, weddingId },
        select: { id: true },
      });
      if (events.length !== payload.eventIds.length) {
        return NextResponse.json({ error: "One or more events are invalid for this wedding" }, { status: 400 });
      }
    }

    const vendor = await prisma.vendor.create({
      data: {
        weddingId,
        name: payload.name,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        notes: payload.notes,
        totalCostMinor: payload.totalCostMinor,
        depositMinor: payload.depositMinor,
        amountPaidMinor: payload.amountPaidMinor,
        paymentStatus: payload.paymentStatus,
        dueDate: payload.dueDate,
        vendorEvents: payload.eventIds.length
          ? {
              createMany: {
                data: payload.eventIds.map((eventId) => ({ eventId })),
              },
            }
          : undefined,
      },
      include: {
        vendorEvents: { include: { event: true } },
      },
    });
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
