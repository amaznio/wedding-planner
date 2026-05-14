import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { requireAppRole } from "@/lib/app-authz";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const updateUserRoleSchema = z.object({
  role: z.enum(["SUPERADMIN", "ADMIN", "USER"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireAppRole("SUPERADMIN");
  if (authz.response) return authz.response;

  const { userId } = await context.params;

  try {
    const body = await request.json();
    const payload = updateUserRoleSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: payload.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
