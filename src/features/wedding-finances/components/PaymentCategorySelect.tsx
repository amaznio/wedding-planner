"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentFormField } from "@/features/wedding-finances/components/PaymentFormControls";
import {
  getPaymentCategoryLabel,
  isKnownPaymentCategory,
  vendorPaymentCategoryValues,
  weddingExpenseCategoryValues,
} from "@/features/wedding-finances/lib/payment-options";

export function PaymentCategorySelect({ fieldLabel, value, placeholder, onChange, t }: {
  fieldLabel: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
}) {
  const customCategory = value && !isKnownPaymentCategory(value) ? value : null;

  return (
    <PaymentFormField label={fieldLabel}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={fieldLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t("budget.page.categoryGroups.vendorPayments")}</SelectLabel>
            {vendorPaymentCategoryValues.map((category) => (
              <SelectItem key={category} value={category}>{getPaymentCategoryLabel(category, t)}</SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{t("budget.page.categoryGroups.weddingCosts")}</SelectLabel>
            {weddingExpenseCategoryValues.map((category) => (
              <SelectItem key={category} value={category}>{getPaymentCategoryLabel(category, t)}</SelectItem>
            ))}
          </SelectGroup>
          {customCategory ? (
            <>
              <SelectSeparator />
              <SelectItem value={customCategory}>{customCategory}</SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
    </PaymentFormField>
  );
}
