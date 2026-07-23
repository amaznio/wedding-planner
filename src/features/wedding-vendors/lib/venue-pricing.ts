export type VendorPricingEvent = {
  id: string;
  name: string;
  type?: string | null;
  _count?: {
    eventGuests?: number;
  };
};

export function getDefaultVenuePricingEventId(events: VendorPricingEvent[]): string {
  return events.find((event) => event.type === "wedding")?.id ?? events[0]?.id ?? "";
}

export function getVenuePricingGuestCount(events: VendorPricingEvent[], eventId: string): number {
  return events.find((event) => event.id === eventId)?._count?.eventGuests ?? 0;
}

export function calculateVenueTotalMinor(pricePerPersonMinor: number | null, guestCount: number | null): number | null {
  if (pricePerPersonMinor === null || guestCount === null) return null;
  return pricePerPersonMinor * guestCount;
}
