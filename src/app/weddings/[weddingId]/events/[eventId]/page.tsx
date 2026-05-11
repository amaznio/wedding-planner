"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type EventGuestRow = {
  id: string;
  guestId: string;
  invitationStatus: string;
  rsvpStatus: string;
  requiresSeat: boolean;
  guest: {
    id: string;
    name: string;
  };
};

type SeatingPlanRow = {
  id: string;
  name: string;
  width: number;
  height: number;
};

export default function WeddingEventPage() {
  const params = useParams<{ weddingId: string; eventId: string }>();
  const weddingId = params.weddingId;
  const eventId = params.eventId;
  const [eventGuests, setEventGuests] = useState<EventGuestRow[]>([]);
  const [plans, setPlans] = useState<SeatingPlanRow[]>([]);
  const [planName, setPlanName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [guestsResponse, plansResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/events/${eventId}/guests`, { cache: "no-store" }),
      fetch(`/api/seating-plans?eventId=${eventId}`, { cache: "no-store" }),
    ]);
    if (!guestsResponse.ok) throw new Error("Failed to load event guests");
    if (!plansResponse.ok) throw new Error("Failed to load seating plans");
    const guestsData = (await guestsResponse.json()) as { guests: EventGuestRow[] };
    const plansData = (await plansResponse.json()) as { plans: SeatingPlanRow[] };
    setEventGuests(guestsData.guests ?? []);
    setPlans(plansData.plans ?? []);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load event");
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [eventId, weddingId]);

  const onCreatePlan = async () => {
    if (!planName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/seating-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName.trim(),
          eventId,
          width: 1600,
          height: 1000,
        }),
      });
      if (!response.ok) throw new Error("Failed to create seating plan");
      setPlanName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create seating plan");
    } finally {
      setIsCreating(false);
    }
  };

  const confirmed = eventGuests.filter((item) => item.rsvpStatus === "confirmed").length;
  const declined = eventGuests.filter((item) => item.rsvpStatus === "declined").length;
  const seatable = eventGuests.filter((item) => item.requiresSeat && item.rsvpStatus !== "declined").length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Event Workspace</h1>
        <p className="text-sm text-zinc-600">Confirmed: {confirmed} • Declined: {declined} • Seatable: {seatable}</p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Seating plans</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Seating plan name"
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onCreatePlan}
            disabled={isCreating || !planName.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create plan"}
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link href={`/seating-plans/${plan.id}`} className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                <p className="text-sm font-semibold text-zinc-900">{plan.name}</p>
                <p className="text-xs text-zinc-600">{plan.width} x {plan.height}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Event guests</h2>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <ul className="mt-3 space-y-2">
          {eventGuests.map((row) => (
            <li key={row.id} className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-medium text-zinc-900">{row.guest.name}</p>
              <p className="text-xs text-zinc-600">
                invite: {row.invitationStatus} • rsvp: {row.rsvpStatus} • seat: {row.requiresSeat ? "yes" : "no"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
