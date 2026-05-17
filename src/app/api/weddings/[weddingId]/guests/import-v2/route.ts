import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { importWeddingGuestsCsvSchema } from "@/features/wedding/schemas/wedding.schema";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  out.push(current);
  return out.map((v) => v.trim());
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = importWeddingGuestsCsvSchema.parse(body);

    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

    if (payload.createEventGuestForEventId) {
      const event = await prisma.weddingEvent.findFirst({
        where: { id: payload.createEventGuestForEventId, weddingId },
        select: { id: true },
      });
      if (!event) {
        return NextResponse.json({ error: "Event not found for wedding" }, { status: 400 });
      }
    }

    const lines = payload.csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    }

    const fallbackPlan = await prisma.seatingPlan.findFirst({
      where: { event: { weddingId } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!fallbackPlan) {
      return NextResponse.json(
        { error: "Cannot import guests before at least one seating plan exists for this wedding" },
        { status: 400 },
      );
    }

    let created = 0;
    let skipped = 0;
    const createdIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const line of lines.slice(1)) {
        const cols = parseCsvLine(line);
        const name = cols[0];
        if (!name) {
          skipped += 1;
          continue;
        }
        const sex = cols[1] === "male" || cols[1] === "female" || cols[1] === "unknown" ? cols[1] : "unknown";
        const hasAgeCategoryColumn = cols[2] === "adult" ||
          cols[2] === "teen" ||
          cols[2] === "child" ||
          cols[2] === "small_child" ||
          cols[2] === "toddler_0_2";
        const ageCategory = hasAgeCategoryColumn ? cols[2] : "adult";
        const dietaryRestrictions = (hasAgeCategoryColumn ? cols[3] : cols[2]) || null;
        const notes = (hasAgeCategoryColumn ? cols[4] : cols[3]) || null;

        const guest = await tx.guest.create({
          data: {
            weddingId,
            planId: fallbackPlan.id,
            name,
            sex,
            ageCategory,
            dietaryRestrictions,
            notes,
          } as any,
        });
        created += 1;
        createdIds.push(guest.id);

        if (payload.createEventGuestForEventId) {
          await tx.eventGuest.upsert({
            where: {
              eventId_guestId: {
                eventId: payload.createEventGuestForEventId,
                guestId: guest.id,
              },
            },
            create: {
              eventId: payload.createEventGuestForEventId,
              guestId: guest.id,
              invitationStatus: "invited",
              rsvpStatus: "unknown",
              requiresSeat: true,
            },
            update: {},
          });
        }
      }
    });

    return NextResponse.json({ created, skipped, guestIds: createdIds }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to import guests CSV v2" }, { status: 500 });
  }
}
