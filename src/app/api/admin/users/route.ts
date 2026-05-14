import { NextResponse } from "next/server";

import { requireAppRole } from "@/lib/app-authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authz = await requireAppRole("ADMIN");
  if (authz.response) return authz.response;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users, currentRole: authz.role });
}
