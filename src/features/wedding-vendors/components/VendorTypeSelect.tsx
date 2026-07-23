"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";
import type { VendorType } from "@/features/wedding-vendors/lib/vendor-options";
import { vendorTypeValues } from "@/features/wedding-vendors/lib/vendor-options";
import { VendorFormField } from "./VendorFormField";

export function VendorTypeSelect({ value, onChange }: {
  value: VendorType;
  onChange: (value: VendorType) => void;
}) {
  const { t } = useI18n();
  const label = t("vendors.page.form.vendorType");

  return (
    <VendorFormField label={label}>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as VendorType)}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {vendorTypeValues.map((vendorType) => (
            <SelectItem key={vendorType} value={vendorType}>
              {t(`vendors.page.vendorTypes.${vendorType}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </VendorFormField>
  );
}
