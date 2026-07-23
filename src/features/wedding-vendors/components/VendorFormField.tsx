import type { ReactNode } from "react";
import { WalletCards } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export function VendorFormField({ label, children, description }: {
  label: string;
  children: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="grid w-full gap-1.5 text-sm font-medium text-zinc-900">
      <span>{label}</span>
      {children}
      {description ? <p className="text-xs font-normal text-zinc-500">{description}</p> : null}
    </div>
  );
}

export function VendorAmountInput({ label, value, currency, placeholder, description, onChange }: {
  label: string;
  value: string;
  currency: string;
  placeholder: string;
  description?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <VendorFormField label={label} description={description}>
      <InputGroup>
        <InputGroupAddon className="h-full w-10 shrink-0 justify-center p-0">
          <WalletCards className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={label}
          className="h-full min-w-0 py-0 pl-0 pr-2"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
          placeholder={placeholder}
        />
        <InputGroupAddon className="h-full shrink-0 justify-center border-l border-zinc-200 px-4 pl-4 text-xs font-semibold uppercase tracking-normal text-zinc-500">
          {currency}
        </InputGroupAddon>
      </InputGroup>
    </VendorFormField>
  );
}

function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d,.]/g, "");
  const separatorIndex = cleaned.search(/[,.]/);

  if (separatorIndex === -1) return cleaned;

  const integerPart = cleaned.slice(0, separatorIndex).replace(/[,.]/g, "");
  const decimalPart = cleaned.slice(separatorIndex + 1).replace(/[,.]/g, "").slice(0, 2);
  const separator = cleaned[separatorIndex];

  return `${integerPart}${separator}${decimalPart}`;
}
