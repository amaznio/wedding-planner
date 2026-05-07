import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enPath = path.join(root, "src/i18n/messages/en.json");
const plPath = path.join(root, "src/i18n/messages/pl.json");

const uiFiles = [
  "src/app/page.tsx",
  "src/app/seating-plans/page.tsx",
  "src/app/seating-plans/[planId]/page.tsx",
  "src/features/seating-editor/components/SeatingToolbar.tsx",
  "src/features/seating-editor/components/GuestPanel.tsx",
  "src/features/seating-editor/components/SeatingCanvas.tsx",
  "src/features/seating-editor/components/InspectorPanel.tsx",
  "src/features/seating-editor/components/RectTable.tsx",
  "src/features/seating-editor/components/Seat.tsx",
];

const allowText = new Set(["AM", "+", "›", "%", "Promise", "guests.reduce"]);
const attrNamePattern = /(placeholder|aria-label|title)=\"([^\"]*[A-Za-z][^\"]*)\"/g;
const jsxTextPattern = />\s*([A-Za-z][^<>{}\n]*)\s*</g;

function flatten(obj, prefix = "") {
  const entries = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") entries.push(key);
    else if (v && typeof v === "object") entries.push(...flatten(v, key));
  }
  return entries;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const en = readJson(enPath);
const pl = readJson(plPath);

const enKeys = new Set(flatten(en));
const plKeys = new Set(flatten(pl));
const missingInPl = [...enKeys].filter((k) => !plKeys.has(k));
const missingInEn = [...plKeys].filter((k) => !enKeys.has(k));

let hasError = false;

if (missingInPl.length || missingInEn.length) {
  hasError = true;
  console.error("[i18n:audit] Translation key mismatch detected.");
  if (missingInPl.length) console.error("Missing in pl:", missingInPl.join(", "));
  if (missingInEn.length) console.error("Missing in en:", missingInEn.join(", "));
}

for (const relFile of uiFiles) {
  const absFile = path.join(root, relFile);
  const content = fs.readFileSync(absFile, "utf8");
  const problems = [];

  for (const match of content.matchAll(attrNamePattern)) {
    const value = match[2].trim();
    if (!value || allowText.has(value)) continue;
    problems.push(`hardcoded attr ${match[1]}=\"${value}\"`);
  }

  for (const match of content.matchAll(jsxTextPattern)) {
    const value = match[1].trim();
    if (!value || allowText.has(value)) continue;
    if (value.startsWith("t(")) continue;
    if (value.includes("className=") || value.includes("path d=") || value.includes("=")) continue;
    problems.push(`hardcoded jsx text \"${value}\"`);
  }

  if (problems.length) {
    hasError = true;
    console.error(`[i18n:audit] ${relFile}`);
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log("[i18n:audit] OK");
