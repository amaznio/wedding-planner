import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 20;

export async function GET(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "owner");
  if (authz.response) return authz.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        {
          weddingMemberships: {
            none: { weddingId },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: MAX_RESULTS,
  });

  return NextResponse.json({ users });
}
