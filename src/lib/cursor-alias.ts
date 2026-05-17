const WORDS = {
  en: {
    adjectives: [
      "Calm",
      "Brisk",
      "Bright",
      "Clever",
      "Daring",
      "Gentle",
      "Lucky",
      "Merry",
      "Nimble",
      "Quiet",
      "Rapid",
      "Sunny",
    ],
    animals: [
      "Fox",
      "Otter",
      "Falcon",
      "Lynx",
      "Panda",
      "Robin",
      "Tiger",
      "Wolf",
      "Koala",
      "Hedgehog",
      "Raven",
      "Dolphin",
    ],
  },
  pl: {
    adjectives: [
      "Spokojny",
      "Bystry",
      "Jasny",
      "Sprytny",
      "Śmiały",
      "Łagodny",
      "Szczęśliwy",
      "Wesoły",
      "Zwinny",
      "Cichy",
      "Szybki",
      "Słoneczny",
    ],
    animals: [
      "Lis",
      "Wydra",
      "Sokół",
      "Ryś",
      "Panda",
      "Rudzik",
      "Tygrys",
      "Wilk",
      "Koala",
      "Jeż",
      "Kruk",
      "Delfin",
    ],
  },
} as const;

const CURSOR_ALIAS_KEY_PREFIX = "seating.cursorAlias.v1";
const CURSOR_ALIAS_TOKEN_KEY = `${CURSOR_ALIAS_KEY_PREFIX}.token`;

function randomItem(values: string[]): string {
  const index = Math.floor(Math.random() * values.length);
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function randomIndex(length: number): number {
  return Math.max(0, Math.min(length - 1, Math.floor(Math.random() * length)));
}

function resolveLocale(inputLocale?: string): keyof typeof WORDS {
  const source =
    inputLocale ??
    (typeof window !== "undefined" ? window.navigator.language : "en");
  const lang = (source ?? "en").toLowerCase();
  if (lang.startsWith("pl")) return "pl";
  return "en";
}

function getAliasStorageKey(locale: keyof typeof WORDS): string {
  return `${CURSOR_ALIAS_KEY_PREFIX}.${locale}`;
}

export type CursorAliasToken = {
  adjectiveIndex: number;
  animalIndex: number;
};

function normalizeToken(token: CursorAliasToken, locale: keyof typeof WORDS): CursorAliasToken {
  const words = WORDS[locale];
  return {
    adjectiveIndex:
      ((token.adjectiveIndex % words.adjectives.length) + words.adjectives.length) %
      words.adjectives.length,
    animalIndex: ((token.animalIndex % words.animals.length) + words.animals.length) % words.animals.length,
  };
}

function tokenize(raw: string): CursorAliasToken | null {
  const [a, b] = raw.split(":");
  const adjectiveIndex = Number(a);
  const animalIndex = Number(b);
  if (!Number.isInteger(adjectiveIndex) || !Number.isInteger(animalIndex)) return null;
  return { adjectiveIndex, animalIndex };
}

function serialize(token: CursorAliasToken): string {
  return `${token.adjectiveIndex}:${token.animalIndex}`;
}

export function getStickyCursorAliasToken(inputLocale?: string): CursorAliasToken {
  const locale = resolveLocale(inputLocale);
  const words = WORDS[locale];
  const fallbackToken: CursorAliasToken = {
    adjectiveIndex: randomIndex(words.adjectives.length),
    animalIndex: randomIndex(words.animals.length),
  };

  if (typeof window === "undefined") return fallbackToken;

  const existingRaw = window.localStorage.getItem(CURSOR_ALIAS_TOKEN_KEY)?.trim();
  if (existingRaw) {
    const parsed = tokenize(existingRaw);
    if (parsed) return normalizeToken(parsed, locale);
  }

  window.localStorage.setItem(CURSOR_ALIAS_TOKEN_KEY, serialize(fallbackToken));
  return fallbackToken;
}

export function localizeCursorAlias(token: CursorAliasToken, inputLocale?: string): string {
  const locale = resolveLocale(inputLocale);
  const normalized = normalizeToken(token, locale);
  const words = WORDS[locale];
  return `${words.adjectives[normalized.adjectiveIndex]} ${words.animals[normalized.animalIndex]}`;
}

export function createRandomCursorAlias(inputLocale?: string): string {
  const locale = resolveLocale(inputLocale);
  const token = createRandomCursorAliasToken(locale);
  return localizeCursorAlias(token, locale);
}

export function createRandomCursorAliasToken(inputLocale?: string): CursorAliasToken {
  const locale = resolveLocale(inputLocale);
  const words = WORDS[locale];
  return {
    adjectiveIndex: randomIndex(words.adjectives.length),
    animalIndex: randomIndex(words.animals.length),
  };
}

export function getStickyCursorAlias(inputLocale?: string): string {
  const locale = resolveLocale(inputLocale);
  const storageKey = getAliasStorageKey(locale);

  if (typeof window === "undefined") {
    return locale === "pl" ? "Gość Lis" : "Guest Fox";
  }

  const existing = window.localStorage.getItem(storageKey)?.trim();
  if (existing) return existing;

  const token = getStickyCursorAliasToken(locale);
  const alias = localizeCursorAlias(token, locale);
  window.localStorage.setItem(storageKey, alias);
  return alias;
}
