import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const guests = await prisma.guest.findMany({
    where: { weddingId },
    include: {
      eventGuests: {
        include: { event: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines = [
    "name,sex,dietaryRestrictions,notes,eventName,invitationStatus,rsvpStatus,requiresSeat,eventNotes",
  ];

  for (const guest of guests) {
    if (guest.eventGuests.length === 0) {
      lines.push(
        [
          csvEscape(guest.name),
          guest.sex,
          csvEscape(guest.dietaryRestrictions ?? ""),
          csvEscape(guest.notes ?? ""),
          "",
          "",
          "",
          "",
          "",
        ].join(","),
      );
      continue;
    }
    for (const eventGuest of guest.eventGuests) {
      lines.push(
        [
          csvEscape(guest.name),
          guest.sex,
          csvEscape(guest.dietaryRestrictions ?? ""),
          csvEscape(guest.notes ?? ""),
          csvEscape(eventGuest.event.name),
          eventGuest.invitationStatus,
          eventGuest.rsvpStatus,
          eventGuest.requiresSeat ? "true" : "false",
          csvEscape(eventGuest.notes ?? ""),
        ].join(","),
      );
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wedding-${weddingId}-guests-v2.csv"`,
    },
  });
}
