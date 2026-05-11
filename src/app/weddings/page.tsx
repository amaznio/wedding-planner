"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WeddingListItem = {
  id: string;
  name: string;
  date: string | null;
  currency: string;
  _count: {
    events: number;
    guests: number;
    vendors: number;
    expenses: number;
  };
};

export default function WeddingsPage() {
  const [weddings, setWeddings] = useState<WeddingListItem[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/weddings", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load weddings");
    const data = (await response.json()) as { weddings: WeddingListItem[] };
    setWeddings(data.weddings ?? []);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load weddings");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const onCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), currency: "PLN" }),
      });
      if (!response.ok) throw new Error("Failed to create wedding");
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create wedding");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Weddings</h1>
        <p className="text-sm text-zinc-600">Select a wedding and manage events, guests, vendors, and expenses.</p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wedding name"
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={isSaving || !name.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "Creating..." : "Create"}
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        {isLoading ? (
          <p className="text-sm text-zinc-600">Loading...</p>
        ) : weddings.length === 0 ? (
          <p className="text-sm text-zinc-600">No weddings yet.</p>
        ) : (
          <ul className="space-y-2">
            {weddings.map((wedding) => (
              <li key={wedding.id}>
                <Link
                  href={`/weddings/${wedding.id}`}
                  className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50"
                >
                  <p className="text-sm font-semibold text-zinc-900">{wedding.name}</p>
                  <p className="text-xs text-zinc-600">
                    {wedding.currency} • {wedding._count.events} events • {wedding._count.guests} guests
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
