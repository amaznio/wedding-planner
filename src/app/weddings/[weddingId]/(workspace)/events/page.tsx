import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeddingEventsListPage } from "@/features/wedding-events/components/WeddingEventsListPage";
import {
  WeddingEventsListContentLoading,
  WeddingEventsListPageShell,
} from "@/features/wedding-dashboard/components/WorkspacePageLoading";

type WeddingEventsRoutePageProps = {
  params: Promise<{ weddingId: string }>;
};

export default function WeddingEventsRoutePage({ params }: WeddingEventsRoutePageProps) {
  return (
    <WeddingEventsListPageShell>
      <Suspense fallback={<WeddingEventsListContentLoading />}>
        <WeddingEventsData params={params} />
      </Suspense>
    </WeddingEventsListPageShell>
  );
}

async function WeddingEventsData({ params }: WeddingEventsRoutePageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const { weddingId } = await params;
  const wedding = await prisma.wedding.findFirst({
    where: {
      id: weddingId,
      memberships: { some: { userId: session.user.id } },
    },
    select: {
      id: true,
      events: {
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          type: true,
          startsAt: true,
          location: true,
          address: true,
          _count: {
            select: {
              eventGuests: true,
              seatingPlans: true,
              vendorEvents: true,
            },
          },
          eventGuests: {
            select: {
              rsvpStatus: true,
            },
          },
        },
      },
    },
  });

  if (!wedding) {
    redirect("/weddings");
  }

  return (
    <WeddingEventsListPage
      embedded
      weddingId={weddingId}
      events={wedding.events.map((event) => ({
        ...event,
        startsAt: event.startsAt?.toISOString() ?? null,
      }))}
      nowIso={new Date().toISOString()}
    />
  );
}
