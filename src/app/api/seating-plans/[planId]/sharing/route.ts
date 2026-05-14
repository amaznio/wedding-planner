import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

const updateSharingSchema = z.object({
  isPublicRead: z.boolean(),
});

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid request payload",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { planId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  if (authz.isStandalonePlan) {
    return NextResponse.json(
      { error: "Public sharing is only supported for event-linked seating plans" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const payload = updateSharingSchema.parse(body);

    const plan = await prisma.seatingPlan.update({
      where: { id: planId },
      data: {
        isPublicRead: payload.isPublicRead,
      },
      select: {
        id: true,
        isPublicRead: true,
      },
    });

    return NextResponse.json({
      plan,
      access: {
        role: authz.role,
        canEdit: authz.canEdit,
        isPublicRead: plan.isPublicRead,
        isPublicViewer: false,
        isStandalonePlan: false,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to update sharing settings" }, { status: 500 });
  }
}
