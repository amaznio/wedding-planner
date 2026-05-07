export const PLUS_ONE_MARKERS = ["Osoba Tow."] as const;

export function normalizeImportName(value: string): string {
  return value.trim().toLowerCase();
}

export function isPlusOneMarker(value: string): boolean {
  const normalized = normalizeImportName(value);
  return PLUS_ONE_MARKERS.some((marker) => normalizeImportName(marker) === normalized);
}
