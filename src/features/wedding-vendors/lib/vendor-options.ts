export const vendorTypeValues = [
  "Venue",
  "Catering",
  "Photographer",
  "Videographer",
  "Dj",
  "Band",
  "DecorFlorals",
  "Coordinator",
  "Officiant",
  "Makeup",
  "Hair",
  "CakeBakery",
  "Stationery",
  "RingsJewelry",
  "DressAttire",
  "SuitAttire",
  "Transport",
  "Accommodation",
  "Rentals",
  "Entertainment",
  "GiftsFavors",
  "Other",
] as const;

export type VendorType = (typeof vendorTypeValues)[number];

export const defaultVendorType: VendorType = "Other";

export function isVendorType(value: string): value is VendorType {
  return vendorTypeValues.includes(value as VendorType);
}

export function normalizeVendorType(value: string | null | undefined): VendorType {
  return value && isVendorType(value) ? value : defaultVendorType;
}
