import { NextResponse } from "next/server";

import { requireAppRole } from "@/lib/app-authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authz = await requireAppRole("ADMIN");
  if (authz.response) return authz.response;

  const weddings = await prisma.wedding.findMany({
    where: {
      OR: [
        { ownerId: null },
        {
          memberships: {
            none: { role: "owner" },
          },
        },
      ],
    },
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          events: true,
          guests: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ weddings, currentRole: authz.role });
}
