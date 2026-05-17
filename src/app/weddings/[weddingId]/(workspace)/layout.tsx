import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WeddingShell } from "@/features/wedding-shell/components/WeddingShell";
import type { DashboardNavItem } from "@/features/wedding-dashboard/types";
import { auth } from "@/lib/auth";
import { getWeddingRoutes } from "@/lib/routes";

type WeddingWorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingWorkspaceLayout({
  children,
  params,
}: WeddingWorkspaceLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }

  const { weddingId } = await params;
  const wedding = await prisma.wedding.findFirst({
    where: {
      id: weddingId,
      memberships: {
        some: { userId: session.user.id },
      },
    },
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

  const eventNamesById = Object.fromEntries(wedding.events.map((event) => [event.id, event.name]));
  const routes = getWeddingRoutes(weddingId);

  const navigation: DashboardNavItem[] = [
    { id: "home", href: routes.root },
    { id: "guests", href: routes.guests },
    { id: "events", href: routes.events },
    { id: "seating", href: routes.seating },
    { id: "budget", href: routes.budget },
    { id: "vendors", href: routes.vendors },
    { id: "tasks", href: routes.tasks, counter: 12 },
    { id: "notes", href: routes.notes },
    { id: "documents", href: routes.documents },
    { id: "collaborators", href: routes.collaborators },
    { id: "settings", href: routes.settings },
  ];

  return (
    <WeddingShell
      weddingId={weddingId}
      navigation={navigation}
      eventNamesById={eventNamesById}
      currentUser={{
        name: session.user.name ?? session.user.email ?? "User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    >
      {children}
    </WeddingShell>
  );
}
