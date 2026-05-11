"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type WeddingGuest = {
  id: string;
  name: string;
  sex: "male" | "female" | "unknown";
  dietaryRestrictions: string | null;
  notes: string | null;
};

export default function WeddingGuestsPage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [guests, setGuests] = useState<WeddingGuest[]>([]);
  const [name, setName] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch(`/api/weddings/${weddingId}/guests`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load guests");
    const data = (await response.json()) as { guests: WeddingGuest[] };
    setGuests(data.guests ?? []);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load guests");
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [weddingId]);

  const onCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dietaryRestrictions: dietaryRestrictions.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Failed to create guest");
      }
      setName("");
      setDietaryRestrictions("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create guest");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Wedding guests</h1>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Guest name"
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <input
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder="Dietary restrictions"
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={isSaving || !name.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "Adding..." : "Add guest"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <ul className="space-y-2">
          {guests.map((guest) => (
            <li key={guest.id} className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-900">{guest.name}</p>
              <p className="text-xs text-zinc-600">
                sex: {guest.sex} • diet: {guest.dietaryRestrictions ?? "-"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
