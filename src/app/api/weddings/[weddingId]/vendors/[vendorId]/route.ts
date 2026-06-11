import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateVendorSchema } from "@/features/wedding/schemas/wedding.schema";
import { getVendorPaymentSummary } from "@/features/wedding-finances/lib/vendor-payment-summary";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; vendorId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId, vendorId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, weddingId },
    include: {
      vendorEvents: { include: { event: true } },
      expenses: true,
    },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  return NextResponse.json({
    vendor: {
      ...vendor,
      ...getVendorPaymentSummary(vendor),
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, vendorId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateVendorSchema.parse(body);
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, weddingId },
      select: { id: true },
    });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    if (payload.eventIds) {
      const events = await prisma.weddingEvent.findMany({
        where: { id: { in: payload.eventIds }, weddingId },
        select: { id: true },
      });
      if (events.length !== payload.eventIds.length) {
        return NextResponse.json({ error: "One or more events are invalid for this wedding" }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          name: payload.name,
          contactName: payload.contactName,
          contactEmail: payload.contactEmail,
          contactPhone: payload.contactPhone,
          notes: payload.notes,
          totalCostMinor: payload.totalCostMinor,
          depositMinor: payload.depositMinor,
          amountPaidMinor: payload.amountPaidMinor,
          paymentStatus: payload.paymentStatus,
          lifecycleStatus: payload.lifecycleStatus,
          dueDate: payload.dueDate,
        },
      });

      if (payload.eventIds) {
        await tx.vendorEvent.deleteMany({ where: { vendorId } });
        if (payload.eventIds.length > 0) {
          await tx.vendorEvent.createMany({
            data: payload.eventIds.map((eventId) => ({ vendorId, eventId })),
          });
        }
      }

      return tx.vendor.findUnique({
        where: { id: next.id },
        include: {
          vendorEvents: { include: { event: true } },
          expenses: true,
        },
      });
    });

    return NextResponse.json({
      vendor: updated
        ? {
            ...updated,
            ...getVendorPaymentSummary(updated),
          }
        : updated,
    });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, vendorId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, weddingId },
    select: { id: true },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  await prisma.vendor.delete({ where: { id: vendorId } });
  return NextResponse.json({ success: true });
}
