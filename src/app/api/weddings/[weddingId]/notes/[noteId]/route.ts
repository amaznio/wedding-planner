import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingNoteSchema } from "@/features/wedding/schemas/wedding.schema";
import { canonicalizeNoteCategory } from "@/features/wedding-notes/lib/note-categories";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; noteId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, noteId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingNoteSchema.parse(body);
    const existing = await prisma.weddingNote.findFirst({
      where: { id: noteId, weddingId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    const categoryRows = payload.category === undefined ? [] : await prisma.weddingNote.findMany({
      where: { weddingId, category: { not: null } },
      select: { category: true },
      orderBy: { createdAt: "asc" },
    });

    const note = await prisma.weddingNote.update({
      where: { id: noteId },
      data: {
        title: payload.title,
        body: payload.body,
        category: canonicalizeNoteCategory(payload.category, categoryRows.map((row) => row.category)),
        pinned: payload.pinned,
      },
    });
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, noteId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.weddingNote.findFirst({
    where: { id: noteId, weddingId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  await prisma.weddingNote.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
}
