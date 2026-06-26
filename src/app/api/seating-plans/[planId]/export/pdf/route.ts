import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { buildSeatingPrintModel } from "@/features/seating-export/lib/build-print-model";
import { buildSeatingPlanPdf } from "@/features/seating-export/lib/pdf/build-pdf";
import { parseSeatingExportOptionsFromSearchParams } from "@/features/seating-export/schemas/export-options.schema";
import type { SeatingTableType } from "@/features/seating-editor/types/seating-plan.types";
import { prisma } from "@/lib/prisma";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

function sanitizeFilename(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "seating-plan";
}

function normalizeTableType(type: string): SeatingTableType {
  return type === "circle" ? "circle" : "rectangle";
}

export async function GET(request: Request, context: RouteContext) {
  const { planId } = await context.params;
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `pdf-export-${Date.now()}`;
  const authz = await requireSeatingPlanRole(planId, "viewer");
  if (authz.response) return authz.response;

  try {
    const url = new URL(request.url);
    const options = parseSeatingExportOptionsFromSearchParams(url.searchParams);

    const plan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      include: {
        tables: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    const guests = await prisma.guest.findMany({
      where: { planId },
      include: {
        assignments: {
          where: { planId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const printModel = buildSeatingPrintModel({
      plan: {
        id: plan.id,
        name: plan.name,
        width: plan.width,
        height: plan.height,
        tables: plan.tables.map((table) => ({
          id: table.id,
          label: table.label,
          type: normalizeTableType(table.type),
          x: table.x,
          y: table.y,
          rotation: table.rotation,
          seatCount: table.seatCount,
          seatLayout: (table.seatLayout as "balanced" | "top-only" | "bottom-only") ?? "balanced",
        })),
      },
      guests: guests.map((guest) => ({
        id: guest.id,
        name: guest.name,
        isPlaceholderPlusOne: guest.isPlaceholderPlusOne,
        assignment: guest.assignments[0]
          ? {
              tableId: guest.assignments[0].tableId,
              seatNumber: guest.assignments[0].seatNumber,
            }
          : null,
      })),
      options,
    });

    const pdfBytes = await buildSeatingPlanPdf(printModel);

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(plan.name)}-seating.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid export options",
          requestId,
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("seating_pdf_export_failed", {
      requestId,
      planId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
    });

    return NextResponse.json(
      {
        error: "Failed to export seating PDF",
        requestId,
      },
      { status: 500 },
    );
  }
}
