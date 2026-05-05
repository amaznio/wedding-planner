"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PlanListItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

export default function SeatingPlansListPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/seating-plans", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load seating plans");
        }

        const data = (await response.json()) as { plans: PlanListItem[] };
        setPlans(data.plans ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load seating plans",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPlans();
  }, []);

  const handleCreatePlan = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch("/api/seating-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `New Plan ${new Date().toLocaleDateString()}`,
          width: 1600,
          height: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create seating plan");
      }

      const data = (await response.json()) as { plan: PlanListItem };
      router.push(`/seating-plans/${data.plan.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create seating plan",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Seating Plans</h1>
          <p className="text-sm text-zinc-600">Create a plan or open an existing one.</p>
        </div>

        <button
          type="button"
          onClick={handleCreatePlan}
          disabled={isCreating}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create New Plan"}
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        {isLoading ? (
          <p className="text-sm text-zinc-600">Loading plans...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-zinc-600">No seating plans yet.</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/seating-plans/${plan.id}`}
                  className="block rounded-md border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
                >
                  <p className="text-sm font-semibold text-zinc-900">{plan.name}</p>
                  <p className="text-xs text-zinc-600">
                    {plan.width} x {plan.height}
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
