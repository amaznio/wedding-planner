export const CURSOR_COLOR_PRESETS = [
  { key: "sky", label: "Sky", markerClass: "text-sky-600", chipClass: "border-sky-200 bg-sky-50 text-sky-700", labelClass: "border-sky-200 bg-sky-50/95 text-sky-700 ring-sky-100/80" },
  { key: "emerald", label: "Emerald", markerClass: "text-emerald-600", chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700", labelClass: "border-emerald-200 bg-emerald-50/95 text-emerald-700 ring-emerald-100/80" },
  { key: "amber", label: "Amber", markerClass: "text-amber-600", chipClass: "border-amber-200 bg-amber-50 text-amber-700", labelClass: "border-amber-200 bg-amber-50/95 text-amber-700 ring-amber-100/80" },
  { key: "rose", label: "Rose", markerClass: "text-rose-600", chipClass: "border-rose-200 bg-rose-50 text-rose-700", labelClass: "border-rose-200 bg-rose-50/95 text-rose-700 ring-rose-100/80" },
  { key: "violet", label: "Violet", markerClass: "text-violet-600", chipClass: "border-violet-200 bg-violet-50 text-violet-700", labelClass: "border-violet-200 bg-violet-50/95 text-violet-700 ring-violet-100/80" },
  { key: "cyan", label: "Cyan", markerClass: "text-cyan-600", chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700", labelClass: "border-cyan-200 bg-cyan-50/95 text-cyan-700 ring-cyan-100/80" },
  { key: "lime", label: "Lime", markerClass: "text-lime-600", chipClass: "border-lime-200 bg-lime-50 text-lime-700", labelClass: "border-lime-200 bg-lime-50/95 text-lime-700 ring-lime-100/80" },
  { key: "fuchsia", label: "Fuchsia", markerClass: "text-fuchsia-600", chipClass: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700", labelClass: "border-fuchsia-200 bg-fuchsia-50/95 text-fuchsia-700 ring-fuchsia-100/80" },
] as const;

export type CursorColorKey = (typeof CURSOR_COLOR_PRESETS)[number]["key"];

const DEFAULT_CURSOR_COLOR: CursorColorKey = "sky";

export function resolveCursorColorKey(value: string | null | undefined): CursorColorKey {
  if (!value) return DEFAULT_CURSOR_COLOR;
  return (
    CURSOR_COLOR_PRESETS.find((preset) => preset.key === value)?.key ?? DEFAULT_CURSOR_COLOR
  );
}

export function getCursorColorPreset(colorKey: string | null | undefined) {
  const resolvedKey = resolveCursorColorKey(colorKey);
  return (
    CURSOR_COLOR_PRESETS.find((preset) => preset.key === resolvedKey) ??
    CURSOR_COLOR_PRESETS[0]
  );
}
