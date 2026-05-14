"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeddingWorkspaceShell } from "@/features/wedding-dashboard/components/WeddingWorkspaceShell";

type Vendor = {
  id: string;
  name: string;
  totalCostMinor: number;
  depositMinor: number;
  amountPaidMinor: number;
  paymentStatus: string;
};

type WeddingAccessResponse = {
  access: {
    role: "owner" | "editor" | "viewer";
    canEdit: boolean;
    canManageMembers: boolean;
    canDeleteWedding: boolean;
  };
};

export default function WeddingVendorsPage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const { openSidebar } = useWeddingWorkspaceShell();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const load = useCallback(async () => {
    const [vendorsResponse, weddingResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
    ]);
    if (!vendorsResponse.ok) throw new Error("Failed to load vendors");
    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingAccessResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
    }
    const data = (await vendorsResponse.json()) as { vendors: Vendor[] };
    setVendors(data.vendors ?? []);
  }, [weddingId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load vendors");
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
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) throw new Error("Failed to create vendor");
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create vendor");
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
        <h1 className="text-2xl font-semibold text-zinc-900">Vendors</h1>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vendor name"
            disabled={!canEdit}
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={!canEdit || isSaving || !name.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "Adding..." : "Add vendor"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <ul className="space-y-2">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-900">{vendor.name}</p>
              <p className="text-xs text-zinc-600">
                status: {vendor.paymentStatus} • total: {vendor.totalCostMinor} • paid: {vendor.amountPaidMinor}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
