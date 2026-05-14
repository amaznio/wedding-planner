import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { importExpensesCsvSchema } from "@/features/wedding/schemas/wedding.schema";
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
    const payload = importExpensesCsvSchema.parse(body);

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { id: true, currency: true },
    });
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

    const lines = payload.csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const line of lines.slice(1)) {
        const [title, category, amountMinorRaw, currency, incurredAtRaw, status, paidBy, , , notes] =
          parseCsvLine(line);
        if (!title || !category) {
          skipped += 1;
          continue;
        }
        const amountMinor = Number.parseInt(amountMinorRaw ?? "", 10);
        if (!Number.isFinite(amountMinor) || amountMinor < 0) {
          skipped += 1;
          continue;
        }
        const normalizedStatus =
          status === "planned" ||
          status === "committed" ||
          status === "paid" ||
          status === "reimbursed" ||
          status === "canceled"
            ? status
            : "planned";

        await tx.expense.create({
          data: {
            weddingId,
            title,
            category,
            amountMinor,
            currency: currency?.trim().length === 3 ? currency.trim().toUpperCase() : wedding.currency,
            incurredAt: incurredAtRaw ? new Date(incurredAtRaw) : new Date(),
            status: normalizedStatus,
            paidBy: paidBy || null,
            notes: notes || null,
          },
        });
        created += 1;
      }
    });

    return NextResponse.json({ created, skipped }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to import expenses CSV v2" }, { status: 500 });
  }
}
