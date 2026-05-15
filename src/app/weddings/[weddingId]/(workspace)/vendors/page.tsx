"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";

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
  const { t } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load vendors");
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
    <main className="mx-auto flex w-full max-w-5xl flex-col">
      <WorkspacePageHeader
        title={t("dashboard.sidebar.nav.vendors")}
        subtitle={t("dashboard.workspace.vendors.subtitle")}
      />

      <div className="mt-5 flex flex-col gap-5">
        <Card className="gap-0 py-0">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("dashboard.workspace.vendors.namePlaceholder")}
                disabled={!canEdit}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={onCreate}
                disabled={!canEdit || isSaving || !name.trim()}
                variant="primary"
              >
                {isSaving ? t("dashboard.workspace.vendors.adding") : t("dashboard.workspace.vendors.add")}
              </Button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardContent className="p-4">
            <ul className="space-y-2">
              {vendors.map((vendor) => (
                <li key={vendor.id} className="rounded-md border border-zinc-200 p-3">
                  <p className="text-sm font-semibold text-zinc-900">{vendor.name}</p>
                  <p className="text-xs text-zinc-600">
                    {t("dashboard.workspace.vendors.statusLabel")}: {vendor.paymentStatus}
                    {" • "}
                    {t("dashboard.workspace.vendors.totalLabel")}: {vendor.totalCostMinor}
                    {" • "}
                    {t("dashboard.workspace.vendors.paidLabel")}: {vendor.amountPaidMinor}
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
