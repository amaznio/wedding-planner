import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { LOCALE_COOKIE_KEY, normalizeLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { WeddingWorkspaceShell } from "@/features/wedding-dashboard/components/WeddingWorkspaceShell";
import type { DashboardNavItem } from "@/features/wedding-dashboard/types";

type WeddingWorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingWorkspaceLayout({
  children,
  params,
}: WeddingWorkspaceLayoutProps) {
  const { weddingId } = await params;
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    include: {
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true },
      },
    },
  });

  if (!wedding) {
    notFound();
  }

  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);
  const firstEventId = wedding.events[0]?.id;

  const navigation: DashboardNavItem[] = [
    { id: "home", href: `/weddings/${weddingId}` },
    { id: "schedule", disabled: true },
    { id: "tasks", disabled: true, counter: 12 },
    { id: "guests", href: `/weddings/${weddingId}/guests` },
    firstEventId
      ? { id: "events", href: `/weddings/${weddingId}/events/${firstEventId}` }
      : { id: "events", disabled: true },
    { id: "budget", href: `/weddings/${weddingId}/expenses` },
    { id: "vendors", href: `/weddings/${weddingId}/vendors` },
    { id: "notes", disabled: true },
    { id: "documents", disabled: true },
    { id: "inspiration", disabled: true },
  ];

  return (
    <WeddingWorkspaceShell
      weddingName={wedding.name}
      weddingDateLabel={formatWeddingDate(wedding.date, locale)}
      navigation={navigation}
      currentUser={{ name: "Klaudia", email: "klaudia@example.com" }}
    >
      {children}
    </WeddingWorkspaceShell>
  );
}

function formatWeddingDate(value: Date | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}
