import { notFound } from "next/navigation";
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
        select: { id: true, name: true },
      },
    },
  });

  if (!wedding) {
    notFound();
  }

  const firstEventId = wedding.events[0]?.id;
  const eventNamesById = Object.fromEntries(wedding.events.map((event) => [event.id, event.name]));

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
      weddingId={weddingId}
      navigation={navigation}
      eventNamesById={eventNamesById}
      currentUser={{ name: "Klaudia", email: "klaudia@example.com" }}
    >
      {children}
    </WeddingWorkspaceShell>
  );
}
