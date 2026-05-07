const GROUP_COLOR_PALETTE = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#D97706",
  "#9333EA",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
  "#65A30D",
  "#EA580C",
  "#0F766E",
  "#B91C1C",
] as const;

export function normalizeGroupName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function getGroupColorByIndex(index: number): string {
  if (index < 0) return GROUP_COLOR_PALETTE[0];
  return GROUP_COLOR_PALETTE[index % GROUP_COLOR_PALETTE.length];
}

export function getGroupColorPalette() {
  return [...GROUP_COLOR_PALETTE];
}
