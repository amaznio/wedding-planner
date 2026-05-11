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
  const expenses = await prisma.expense.findMany({
    where: { weddingId },
    include: { event: true, vendor: true },
    orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
  });

  const lines = [
    "title,category,amountMinor,currency,incurredAt,status,paidBy,eventName,vendorName,notes",
  ];

  for (const expense of expenses) {
    lines.push(
      [
        csvEscape(expense.title),
        csvEscape(expense.category),
        String(expense.amountMinor),
        expense.currency,
        expense.incurredAt.toISOString(),
        expense.status,
        csvEscape(expense.paidBy ?? ""),
        csvEscape(expense.event?.name ?? ""),
        csvEscape(expense.vendor?.name ?? ""),
        csvEscape(expense.notes ?? ""),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wedding-${weddingId}-expenses-v2.csv"`,
    },
  });
}
