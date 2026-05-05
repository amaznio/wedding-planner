import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ planId: string; assignmentId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { planId, assignmentId } = await context.params;

  const assignment = await prisma.seatAssignment.findFirst({
    where: {
      id: assignmentId,
      planId,
    },
    select: { id: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.seatAssignment.delete({
    where: { id: assignmentId },
  });

  return NextResponse.json({ success: true });
}
