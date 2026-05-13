import type { Locale } from "@/i18n/config";

const intlLocaleByAppLocale: Record<Locale, string> = {
  en: "en-US",
  pl: "pl-PL",
};

export function toIntlLocale(locale: Locale): string {
  return intlLocaleByAppLocale[locale];
}

export function formatCurrencyMinor(valueMinor: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

export function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function formatShortDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatMonthDay(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(value);
}

export function getCountdownDays(targetDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
