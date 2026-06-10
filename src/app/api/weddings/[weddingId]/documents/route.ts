import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingDocumentSchema } from "@/features/wedding/schemas/wedding.schema";
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

  const documents = await prisma.weddingDocument.findMany({
    where: { weddingId },
    include: {
      event: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  return NextResponse.json({ documents });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = createWeddingDocumentSchema.parse(body);
    const validation = await validateLinks(weddingId, payload.eventId, payload.vendorId);
    if (validation.response) return validation.response;

    const document = await prisma.weddingDocument.create({
      data: {
        weddingId,
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
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

async function validateLinks(weddingId: string, eventId?: string | null, vendorId?: string | null) {
  const [wedding, event, vendor] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } }),
    eventId ? prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId }, select: { id: true } }) : Promise.resolve(null),
    vendorId ? prisma.vendor.findFirst({ where: { id: vendorId, weddingId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (!wedding) return { response: NextResponse.json({ error: "Wedding not found" }, { status: 404 }) };
  if (eventId && !event) return { response: NextResponse.json({ error: "Event is invalid for this wedding" }, { status: 400 }) };
  if (vendorId && !vendor) return { response: NextResponse.json({ error: "Vendor is invalid for this wedding" }, { status: 400 }) };
  return { response: null };
}
