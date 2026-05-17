import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeddingSeatingPage } from "@/features/seating-editor/components/WeddingSeatingPage";

type WeddingSeatingRoutePageProps = {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<{ planMismatch?: string }>;
};

export default async function WeddingSeatingRoutePage({ params, searchParams }: WeddingSeatingRoutePageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const { weddingId } = await params;
  const { planMismatch } = await searchParams;
  const [membership, events, plans] = await Promise.all([
    prisma.weddingMembership.findUnique({
      where: {
        weddingId_userId: {
          weddingId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    }),
    prisma.weddingEvent.findMany({
      where: {
        weddingId,
        wedding: {
          memberships: { some: { userId: session.user.id } },
        },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.seatingPlan.findMany({
      where: {
        event: {
          weddingId,
          wedding: {
            memberships: { some: { userId: session.user.id } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        width: true,
        height: true,
        updatedAt: true,
        assignments: { select: { id: true } },
        guests: { select: { id: true } },
        event: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <WeddingSeatingPage
      weddingId={weddingId}
      canEdit={membership?.role === "owner" || membership?.role === "editor"}
      events={events}
      planMismatch={planMismatch === "1"}
      plans={plans.map((plan) => ({
        ...plan,
        updatedAt: plan.updatedAt.toISOString(),
      }))}
    />
  );
}
