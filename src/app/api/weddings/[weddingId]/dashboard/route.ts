import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { id: true, currency: true },
  });
  if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

  const [events, expenseAgg, vendors] = await Promise.all([
    prisma.weddingEvent.findMany({
      where: { weddingId },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            eventGuests: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.groupBy({
      by: ["status"],
      where: { weddingId },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.vendor.findMany({
      where: { weddingId },
      select: {
        id: true,
        name: true,
        totalCostMinor: true,
        depositMinor: true,
        amountPaidMinor: true,
        paymentStatus: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rsvpByEvent = await Promise.all(
    events.map(async (event) => {
      const [invited, confirmed, declined, maybe, seatedEligible] = await Promise.all([
        prisma.eventGuest.count({
          where: { eventId: event.id, invitationStatus: "invited" },
        }),
        prisma.eventGuest.count({
          where: { eventId: event.id, rsvpStatus: "confirmed" },
        }),
        prisma.eventGuest.count({
          where: { eventId: event.id, rsvpStatus: "declined" },
        }),
        prisma.eventGuest.count({
          where: { eventId: event.id, rsvpStatus: "maybe" },
        }),
        prisma.eventGuest.count({
          where: {
            eventId: event.id,
            requiresSeat: true,
            rsvpStatus: { not: "declined" },
          },
        }),
      ]);
      return {
        eventId: event.id,
        name: event.name,
        type: event.type,
        totalEventGuests: event._count.eventGuests,
        invited,
        confirmed,
        declined,
        maybe,
        seatedEligible,
      };
    }),
  );

  const vendorSummary = vendors.reduce(
    (acc, vendor) => {
      acc.totalCostMinor += vendor.totalCostMinor;
      acc.totalDepositMinor += vendor.depositMinor;
      acc.totalPaidMinor += vendor.amountPaidMinor;
      return acc;
    },
    { totalCostMinor: 0, totalDepositMinor: 0, totalPaidMinor: 0 },
  );

  return NextResponse.json({
    currency: wedding.currency,
    rsvpByEvent,
    expenseSummary: expenseAgg,
    vendorSummary: {
      ...vendorSummary,
      remainingMinor: Math.max(0, vendorSummary.totalCostMinor - vendorSummary.totalPaidMinor),
    },
  });
}
