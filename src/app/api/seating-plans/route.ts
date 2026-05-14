import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSeatingPlanSchema } from "@/features/seating-editor/schemas/seating-plan.schema";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/lib/auth-session";
import { buildWeddingAccess, requireWeddingEventRole } from "@/lib/wedding-authz";

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid request payload",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  const { session, unauthorized } = await requireAuthSession();
  if (unauthorized || !session) return unauthorized;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (eventId) {
    const eventAuthz = await requireWeddingEventRole(eventId, "viewer");
    if (eventAuthz.response) return eventAuthz.response;
  }

  const plans = await prisma.seatingPlan.findMany({
    where: eventId
      ? { eventId }
      : {
          OR: [
            { eventId: null },
            {
              event: {
                wedding: {
                  memberships: {
                    some: { userId: session.user.id },
                  },
                },
              },
            },
          ],
        },
    include: {
      tables: {
        orderBy: { createdAt: "asc" },
      },
      event: {
        select: {
          weddingId: true,
          wedding: {
            select: {
              memberships: {
                where: { userId: session.user.id },
                select: { role: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const plansWithAccess = plans.map(({ event, ...plan }) => {
    const membershipRole = event?.wedding.memberships[0]?.role ?? null;
    return {
      ...plan,
      access: membershipRole ? buildWeddingAccess(membershipRole) : null,
    };
  });

  return NextResponse.json({ plans: plansWithAccess });
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const payload = createSeatingPlanSchema.parse(body);

    let access = null;

    if (payload.eventId) {
      const eventAuthz = await requireWeddingEventRole(payload.eventId, "editor");
      if (eventAuthz.response) return eventAuthz.response;
      access = eventAuthz.access;
    }

    const plan = await prisma.seatingPlan.create({
      data: {
        eventId: payload.eventId,
        name: payload.name,
        width: payload.width,
        height: payload.height,
        pairSidePreference: payload.pairSidePreference,
      },
      include: {
        tables: true,
      },
    });

    return NextResponse.json({ plan, access }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      {
        error: "Failed to create seating plan",
      },
      { status: 500 },
    );
  }
}
