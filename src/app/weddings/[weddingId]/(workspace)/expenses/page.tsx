"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeddingWorkspaceShell } from "@/features/wedding-dashboard/components/WeddingWorkspaceShell";

type Expense = {
  id: string;
  title: string;
  category: string;
  amountMinor: number;
  currency: string;
  status: string;
};

type WeddingAccessResponse = {
  access: {
    role: "owner" | "editor" | "viewer";
    canEdit: boolean;
    canManageMembers: boolean;
    canDeleteWedding: boolean;
  };
};

export default function WeddingExpensesPage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const { openSidebar } = useWeddingWorkspaceShell();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amountMinor, setAmountMinor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const totalMinor = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amountMinor, 0),
    [expenses],
  );

  const load = useCallback(async () => {
    const [expensesResponse, weddingResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/expenses`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
    ]);
    if (!expensesResponse.ok) throw new Error("Failed to load expenses");
    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingAccessResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
    }
    const data = (await expensesResponse.json()) as { expenses: Expense[] };
    setExpenses(data.expenses ?? []);
  }, [weddingId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load expenses");
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);

  const onCreate = async () => {
    if (!canEdit) return;
    if (!title.trim() || !category.trim() || !amountMinor.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const numericAmount = Number.parseInt(amountMinor, 10);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        throw new Error("Amount must be a non-negative integer in minor units");
      }
      const response = await fetch(`/api/weddings/${weddingId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          amountMinor: numericAmount,
          status: "planned",
        }),
      });
      if (!response.ok) throw new Error("Failed to create expense");
      setTitle("");
      setCategory("");
      setAmountMinor("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create expense");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-3 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Expenses</h1>
        <p className="text-sm text-zinc-600">Total tracked: {totalMinor}</p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Expense title"
            disabled={!canEdit}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            disabled={!canEdit}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <input
            value={amountMinor}
            onChange={(e) => setAmountMinor(e.target.value)}
            placeholder="Amount (minor)"
            disabled={!canEdit}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={!canEdit || isSaving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "Adding..." : "Add expense"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <ul className="space-y-2">
          {expenses.map((expense) => (
            <li key={expense.id} className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-900">{expense.title}</p>
              <p className="text-xs text-zinc-600">
                {expense.category} • {expense.amountMinor} {expense.currency} • {expense.status}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
