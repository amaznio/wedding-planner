export function cleanNoteCategory(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeNoteCategory(value: string): string {
  return cleanNoteCategory(value).toLowerCase();
}

export function getCanonicalNoteCategories(values: Array<string | null>): string[] {
  const categories = new Map<string, string>();

  for (const value of values) {
    if (!value) continue;
    const cleaned = cleanNoteCategory(value);
    if (!cleaned) continue;
    const normalized = normalizeNoteCategory(cleaned);
    if (!categories.has(normalized)) categories.set(normalized, cleaned);
  }

  return [...categories.values()].sort((left, right) => left.localeCompare(right));
}

export function canonicalizeNoteCategory(
  value: string | null | undefined,
  existingCategories: Array<string | null>,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const cleaned = cleanNoteCategory(value);
  if (!cleaned) return null;
  const normalized = normalizeNoteCategory(cleaned);

  for (const existing of existingCategories) {
    if (existing && normalizeNoteCategory(existing) === normalized) {
      return cleanNoteCategory(existing);
    }
  }

  return cleaned;
}
