"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type WeddingDetail = {
  id: string;
  name: string;
  currency: string;
  events: Array<{
    id: string;
    name: string;
    type: string;
    startsAt: string | null;
  }>;
  _count: {
    guests: number;
    vendors: number;
    expenses: number;
    households: number;
    guestGroups: number;
  };
};

export default function WeddingDetailPage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [eventName, setEventName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch(`/api/weddings/${weddingId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load wedding");
    const data = (await response.json()) as { wedding: WeddingDetail };
    setWedding(data.wedding);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load wedding");
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [weddingId]);

  const onCreateEvent = async () => {
    if (!eventName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: eventName.trim(), type: "other" }),
      });
      if (!response.ok) throw new Error("Failed to create event");
      setEventName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create event");
    } finally {
      setIsSaving(false);
    }
  };

  if (!wedding) {
    return <main className="p-6 text-sm text-zinc-600">Loading...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{wedding.name}</h1>
        <p className="text-sm text-zinc-600">
          {wedding.currency} • {wedding._count.guests} guests • {wedding._count.vendors} vendors • {wedding._count.expenses} expenses
        </p>
      </header>

      <section className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={`/weddings/${weddingId}/guests`} className="rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50">Guests</Link>
        <Link href={`/weddings/${weddingId}/vendors`} className="rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50">Vendors</Link>
        <Link href={`/weddings/${weddingId}/expenses`} className="rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50">Expenses</Link>
        <Link href={`/weddings/${weddingId}/dashboard`} className="rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50">Dashboard</Link>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Events</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event name"
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onCreateEvent}
            disabled={isSaving || !eventName.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "Creating..." : "Create event"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <ul className="mt-4 space-y-2">
          {wedding.events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/weddings/${weddingId}/events/${event.id}`}
                className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50"
              >
                <p className="text-sm font-semibold text-zinc-900">{event.name}</p>
                <p className="text-xs text-zinc-600">{event.type}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
