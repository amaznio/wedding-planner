import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { hashPassword } from "better-auth/crypto";

import { requireAppRole } from "@/lib/app-authz";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const updateUserPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireAppRole("SUPERADMIN");
  if (authz.response) return authz.response;

  const { userId } = await context.params;

  try {
    const body = await request.json();
    const payload = updateUserPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passwordHash = await hashPassword(payload.password);

    const existingCredentialAccount = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { id: true },
    });

    if (existingCredentialAccount) {
      await prisma.account.update({
        where: { id: existingCredentialAccount.id },
        data: { password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: user.email,
          providerId: "credential",
          userId,
          password: passwordHash,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}

