import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeddingEventsListPage } from "@/features/wedding-events/components/WeddingEventsListPage";

type WeddingEventsRoutePageProps = {
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingEventsRoutePage({ params }: WeddingEventsRoutePageProps) {
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
          _count: { select: { eventGuests: true } },
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
      weddingId={weddingId}
      events={wedding.events.map((event) => ({
        ...event,
        startsAt: event.startsAt?.toISOString() ?? null,
      }))}
      nowIso={new Date().toISOString()}
    />
  );
}
