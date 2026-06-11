import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";
import { getVendorPaymentSummary } from "@/features/wedding-finances/lib/vendor-payment-summary";

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

  const [events, expenseAgg, vendors, recentPayments, activeTaskCount, upcomingTasks] = await Promise.all([
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
        paymentStatus: true,
        lifecycleStatus: true,
        expenses: {
          select: {
            amountMinor: true,
            category: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { weddingId, status: "paid" },
      select: {
        id: true,
        title: true,
        amountMinor: true,
        incurredAt: true,
        vendor: { select: { id: true, name: true } },
      },
      orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.weddingTask.count({
      where: { weddingId, status: { not: "done" } },
    }),
    prisma.weddingTask.findMany({
      where: {
        weddingId,
        status: { not: "done" },
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 4,
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
      const paymentSummary = getVendorPaymentSummary(vendor);
      if (vendor.lifecycleStatus === "canceled") return acc;
      acc.activeCount += 1;
      if (vendor.lifecycleStatus === "booked" || vendor.lifecycleStatus === "contract_signed") {
        acc.securedCount += 1;
      }
      acc.totalCostMinor += vendor.totalCostMinor;
      acc.totalDepositMinor += paymentSummary.depositPaidMinor;
      acc.totalPaidMinor += paymentSummary.amountPaidMinor;
      acc.remainingMinor += paymentSummary.remainingMinor;
      return acc;
    },
    {
      activeCount: 0,
      securedCount: 0,
      totalCostMinor: 0,
      totalDepositMinor: 0,
      totalPaidMinor: 0,
      remainingMinor: 0,
    },
  );

  return NextResponse.json({
    currency: wedding.currency,
    rsvpByEvent,
    expenseSummary: expenseAgg,
    recentPayments,
    activeTaskCount,
    upcomingTasks,
    vendorSummary: {
      ...vendorSummary,
      remainingMinor: vendorSummary.remainingMinor,
    },
  });
}
