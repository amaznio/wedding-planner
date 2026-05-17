"use client";

import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatCard } from "@/components/app/AppStatCard";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

type NoteItem = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

const mockNotes: NoteItem[] = [
  { id: "n1", title: "Ceremony cues", body: "Microphone check and procession timing.", updatedAt: "2026-05-12" },
  { id: "n2", title: "Family seating", body: "Reserve first two rows for close family.", updatedAt: "2026-05-10" },
  { id: "n3", title: "Photo list", body: "Add golden-hour couple shots near garden.", updatedAt: "2026-05-08" },
];

export function WeddingNotesPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col">
      <WeddingPageHeader title={t("notes.page.title")} subtitle={t("notes.page.subtitle")} />
      <AppPageGrid className="mt-5 md:grid-cols-3">
        <AppStatCard title={t("notes.page.stats.total")} value={mockNotes.length} />
        <AppStatCard title={t("notes.page.stats.updatedThisWeek")} value={2} />
        <AppStatCard title={t("notes.page.stats.starred")} value={1} />
      </AppPageGrid>

      <AppPageGrid className="mt-5 md:grid-cols-2">
        {mockNotes.map((note) => (
          <AppSectionCard key={note.id} title={note.title} description={`${t("notes.page.updated")} ${note.updatedAt}`}>
            <p className="text-sm text-zinc-700">{note.body}</p>
          </AppSectionCard>
        ))}
      </AppPageGrid>
    </main>
  );
}
