"use client";

import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";
import {
  calculateVenueTotalMinor,
  getVenuePricingGuestCount,
  type VendorPricingEvent,
} from "@/features/wedding-vendors/lib/venue-pricing";
import { VendorAmountInput, VendorFormField } from "./VendorFormField";

export function VendorVenuePricingFields({
  events,
  currency,
  locale,
  eventId,
  pricePerPerson,
  guestCount,
  onEventChange,
  onPricePerPersonChange,
  onGuestCountChange,
  onUseAsTotal,
}: {
  events: VendorPricingEvent[];
  currency: string;
  locale: string;
  eventId: string;
  pricePerPerson: string;
  guestCount: string;
  onEventChange: (eventId: string, guestCount: number) => void;
  onPricePerPersonChange: (value: string) => void;
  onGuestCountChange: (value: string) => void;
  onUseAsTotal: (amountMinor: number) => void;
}) {
  const { t } = useI18n();
  const pricePerPersonMinor = parseAmountToMinor(pricePerPerson);
  const parsedGuestCount = parseGuestCount(guestCount);
  const estimatedTotalMinor = calculateVenueTotalMinor(pricePerPersonMinor, parsedGuestCount);

  return (
    <section className="grid gap-3 rounded-md border border-zinc-200 p-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("vendors.page.venuePricing.title")}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{t("vendors.page.venuePricing.description")}</p>
      </div>
      <VendorFormField label={t("vendors.page.venuePricing.event")}>
        <Select
          value={eventId}
          onValueChange={(nextEventId) => onEventChange(nextEventId, getVenuePricingGuestCount(events, nextEventId))}
        >
          <SelectTrigger aria-label={t("vendors.page.venuePricing.event")} className="w-full">
            <SelectValue placeholder={t("vendors.page.venuePricing.eventPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </VendorFormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <VendorAmountInput
          label={t("vendors.page.venuePricing.pricePerPerson")}
          value={pricePerPerson}
          currency={currency}
          onChange={onPricePerPersonChange}
          placeholder={t("vendors.page.venuePricing.pricePerPerson")}
        />
        <VendorFormField label={t("vendors.page.venuePricing.guestCount")}>
          <Input
            aria-label={t("vendors.page.venuePricing.guestCount")}
            inputMode="numeric"
            value={guestCount}
            onChange={(event) => onGuestCountChange(sanitizeGuestCount(event.target.value))}
            placeholder={t("vendors.page.venuePricing.guestCount")}
          />
        </VendorFormField>
      </div>
      <div className="flex flex-col gap-3 rounded-md bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
            {t("vendors.page.venuePricing.estimatedTotal")}
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {estimatedTotalMinor === null ? "-" : formatCurrency(estimatedTotalMinor, currency, locale)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (estimatedTotalMinor !== null) onUseAsTotal(estimatedTotalMinor);
          }}
          disabled={estimatedTotalMinor === null}
        >
          <Calculator className="size-4" />
          {t("vendors.page.venuePricing.useAsTotal")}
        </Button>
      </div>
    </section>
  );
}

function parseAmountToMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function parseGuestCount(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function sanitizeGuestCount(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCurrency(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}
