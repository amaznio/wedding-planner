"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";

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
  const { t } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amountMinor, setAmountMinor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load expenses");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);

  if (isLoading) {
    return <WorkspaceRouteLoading maxWidthClassName="max-w-5xl" />;
  }

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
    <main className="mx-auto flex w-full max-w-5xl flex-col">
      <WorkspacePageHeader
        title={t("dashboard.sidebar.nav.budget")}
        subtitle={t("dashboard.workspace.expenses.totalTracked", { total: totalMinor })}
      />

      <div className="mt-5 flex flex-col gap-5">
        <Card className="gap-0 py-0">
          <CardContent className="p-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("dashboard.workspace.expenses.titlePlaceholder")}
                disabled={!canEdit}
              />
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("dashboard.workspace.expenses.categoryPlaceholder")}
                disabled={!canEdit}
              />
              <Input
                value={amountMinor}
                onChange={(e) => setAmountMinor(e.target.value)}
                placeholder={t("dashboard.workspace.expenses.amountPlaceholder")}
                disabled={!canEdit}
              />
              <Button
                type="button"
                onClick={onCreate}
                disabled={!canEdit || isSaving}
                variant="primary"
              >
                {isSaving ? t("dashboard.workspace.expenses.adding") : t("dashboard.workspace.expenses.add")}
              </Button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
