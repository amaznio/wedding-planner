import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingDocumentSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; documentId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, documentId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingDocumentSchema.parse(body);
    const existing = await prisma.weddingDocument.findFirst({
      where: { id: documentId, weddingId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const validation = await validateLinks(weddingId, payload.eventId, payload.vendorId);
    if (validation.response) return validation.response;

    const document = await prisma.weddingDocument.update({
      where: { id: documentId },
      data: {
        name: payload.name,
        category: payload.category,
        ownerName: payload.ownerName,
        status: payload.status,
        externalUrl: payload.externalUrl,
        notes: payload.notes,
        dueDate: payload.dueDate,
        eventId: payload.eventId,
        vendorId: payload.vendorId,
      },
      include: {
        event: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, documentId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.weddingDocument.findFirst({
    where: { id: documentId, weddingId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  await prisma.weddingDocument.delete({ where: { id: documentId } });
  return NextResponse.json({ success: true });
}

async function validateLinks(weddingId: string, eventId?: string | null, vendorId?: string | null) {
  const [event, vendor] = await Promise.all([
    eventId ? prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId }, select: { id: true } }) : Promise.resolve(null),
    vendorId ? prisma.vendor.findFirst({ where: { id: vendorId, weddingId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (eventId && !event) return { response: NextResponse.json({ error: "Event is invalid for this wedding" }, { status: 400 }) };
  if (vendorId && !vendor) return { response: NextResponse.json({ error: "Vendor is invalid for this wedding" }, { status: 400 }) };
  return { response: null };
}
