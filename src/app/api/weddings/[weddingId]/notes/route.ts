import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingNoteSchema } from "@/features/wedding/schemas/wedding.schema";
import { canonicalizeNoteCategory, getCanonicalNoteCategories } from "@/features/wedding-notes/lib/note-categories";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const notes = await prisma.weddingNote.findMany({
    where: { weddingId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  const categoryRows = await prisma.weddingNote.findMany({
    where: { weddingId, category: { not: null } },
    select: { category: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ notes, categories: getCanonicalNoteCategories(categoryRows.map((row) => row.category)) });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = createWeddingNoteSchema.parse(body);
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    const categoryRows = await prisma.weddingNote.findMany({
      where: { weddingId, category: { not: null } },
      select: { category: true },
      orderBy: { createdAt: "asc" },
    });

    const note = await prisma.weddingNote.create({
      data: {
        weddingId,
        title: payload.title,
        body: payload.body,
        category: canonicalizeNoteCategory(payload.category, categoryRows.map((row) => row.category)),
        pinned: payload.pinned,
      },
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
