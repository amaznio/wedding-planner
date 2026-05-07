import { isPlusOneMarker, normalizeImportName } from "../constants/plus-one";

export type GuestImportParsedRow = {
  lineNumber: number;
  name: string;
  normalizedName: string;
  isMarker: boolean;
  isDuplicate: boolean;
};

export type GuestImportParseResult = {
  rows: GuestImportParsedRow[];
  duplicateCount: number;
  markerCount: number;
};

function normalizeCsvField(value: string): string {
  return value.trim().replace(/^"|"$/g, "").replaceAll("\"\"", "\"");
}

export function parseGuestCsvForImport(
  csvText: string,
  existingGuestNames: string[],
): GuestImportParseResult {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const existing = new Set(existingGuestNames.map(normalizeImportName));
  const seenInFile = new Set<string>();

  const rows: GuestImportParsedRow[] = [];
  let duplicateCount = 0;
  let markerCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const value = normalizeCsvField(lines[index] ?? "");
    if (!value) {
      continue;
    }

    const isMarker = isPlusOneMarker(value);
    if (isMarker) {
      markerCount += 1;
      rows.push({
        lineNumber,
        name: value,
        normalizedName: normalizeImportName(value),
        isMarker: true,
        isDuplicate: false,
      });
      continue;
    }

    const normalizedName = normalizeImportName(value);
    const isDuplicate = existing.has(normalizedName) || seenInFile.has(normalizedName);
    if (isDuplicate) {
      duplicateCount += 1;
    } else {
      seenInFile.add(normalizedName);
    }

    rows.push({
      lineNumber,
      name: value,
      normalizedName,
      isMarker: false,
      isDuplicate,
    });
  }

  return {
    rows,
    duplicateCount,
    markerCount,
  };
}
