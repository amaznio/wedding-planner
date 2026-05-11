"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DashboardData = {
  currency: string;
  rsvpByEvent: Array<{
    eventId: string;
    name: string;
    type: string;
    totalEventGuests: number;
    invited: number;
    confirmed: number;
    declined: number;
    maybe: number;
    seatedEligible: number;
  }>;
  expenseSummary: Array<{
    status: string;
    _sum: { amountMinor: number | null };
    _count: { _all: number };
  }>;
  vendorSummary: {
    totalCostMinor: number;
    totalDepositMinor: number;
    totalPaidMinor: number;
    remainingMinor: number;
  };
};

export default function WeddingDashboardPage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/weddings/${weddingId}/dashboard`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load dashboard");
        return (await response.json()) as DashboardData;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"));
  }, [weddingId]);

  if (error) return <main className="p-6 text-sm text-red-600">{error}</main>;
  if (!data) return <main className="p-6 text-sm text-zinc-600">Loading...</main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Wedding dashboard</h1>
        <p className="text-sm text-zinc-600">Currency: {data.currency}</p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">RSVP by event</h2>
        <ul className="mt-3 space-y-2">
          {data.rsvpByEvent.map((item) => (
            <li key={item.eventId} className="rounded-md border border-zinc-200 p-3 text-sm">
              <p className="font-semibold text-zinc-900">{item.name}</p>
              <p className="text-xs text-zinc-600">
                invited {item.invited} • confirmed {item.confirmed} • declined {item.declined} • maybe {item.maybe} • seatable {item.seatedEligible}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Vendor budget</h2>
          <p className="mt-2 text-sm text-zinc-700">Total: {data.vendorSummary.totalCostMinor}</p>
          <p className="text-sm text-zinc-700">Paid: {data.vendorSummary.totalPaidMinor}</p>
          <p className="text-sm text-zinc-700">Remaining: {data.vendorSummary.remainingMinor}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Expenses by status</h2>
          <ul className="mt-2 space-y-1">
            {data.expenseSummary.map((row) => (
              <li key={row.status} className="text-sm text-zinc-700">
                {row.status}: {row._sum.amountMinor ?? 0} ({row._count._all})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
