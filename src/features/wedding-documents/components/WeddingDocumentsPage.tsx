"use client";

import { AppDataTable } from "@/components/app/AppDataTable";
import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatCard } from "@/components/app/AppStatCard";
import { AppStatusBadge } from "@/components/app/AppStatusBadge";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

type DocumentStatus = "draft" | "shared" | "signed";

type WeddingDocument = {
  id: string;
  name: string;
  category: string;
  owner: string;
  status: DocumentStatus;
};

const mockDocuments: WeddingDocument[] = [
  { id: "d1", name: "Venue agreement", category: "Contract", owner: "Adrian", status: "signed" },
  { id: "d2", name: "Shot list v2", category: "Photo", owner: "Gabriela", status: "shared" },
  { id: "d3", name: "Ceremony script", category: "Script", owner: "Planner", status: "draft" },
];

export function WeddingDocumentsPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col">
      <WeddingPageHeader title={t("documents.page.title")} subtitle={t("documents.page.subtitle")} />

      <AppPageGrid className="mt-5 md:grid-cols-3">
        <AppStatCard title={t("documents.page.stats.total")} value={mockDocuments.length} />
        <AppStatCard title={t("documents.page.stats.shared")} value={mockDocuments.filter((doc) => doc.status === "shared").length} />
        <AppStatCard title={t("documents.page.stats.signed")} value={mockDocuments.filter((doc) => doc.status === "signed").length} />
      </AppPageGrid>

      <div className="mt-5">
        <AppSectionCard title={t("documents.page.table.title")} description={t("documents.page.table.description")}>
          <AppDataTable
            columns={[
              { key: "name", label: t("documents.page.table.columns.name") },
              { key: "category", label: t("documents.page.table.columns.category") },
              { key: "owner", label: t("documents.page.table.columns.owner") },
              { key: "status", label: t("documents.page.table.columns.status"), align: "right" },
            ]}
            rows={mockDocuments.map((doc) => ({
              id: doc.id,
              name: doc.name,
              category: doc.category,
              owner: doc.owner,
              status: <AppStatusBadge label={t(`documents.page.status.${doc.status}`)} variant={doc.status === "signed" ? "success" : doc.status === "shared" ? "secondary" : "default"} />,
            }))}
            emptyLabel={t("documents.page.empty")}
          />
        </AppSectionCard>
      </div>
    </main>
  );
}
