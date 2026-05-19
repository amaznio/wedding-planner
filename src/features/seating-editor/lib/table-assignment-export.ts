type ExportTable = {
  id: string;
  label: string;
};

type ExportGuest = {
  name: string;
  assignment: {
    tableId: string;
    seatNumber: number;
  } | null;
};

function normalizeTableLabel(label: string) {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : "Table";
}

export function formatTableAssignmentsExport(
  tables: ExportTable[],
  guests: ExportGuest[],
  locale?: string,
) {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });

  const sections = tables
    .map((table) => {
      const assignedGuests = guests
        .filter((guest) => guest.assignment?.tableId === table.id)
        .sort((a, b) => (a.assignment?.seatNumber ?? 0) - (b.assignment?.seatNumber ?? 0));

      const lines = assignedGuests.map((guest) => guest.name.trim()).filter((name) => name.length > 0);
      return {
        label: normalizeTableLabel(table.label),
        lines,
      };
    })
    .sort((a, b) => collator.compare(a.label, b.label));

  return sections
    .map((section) => [section.label, "----------", ...section.lines].join("\n"))
    .join("\n\n");
}
