"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CalendarDays, WalletCards } from "lucide-react";
import { enUS, pl } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PaymentFormFieldProps = {
  label: string;
  children: ReactNode;
};

export function PaymentFormField({ label, children }: PaymentFormFieldProps) {
  return (
    <div className="grid w-full gap-1.5 text-sm font-medium text-zinc-900">
      <span>{label}</span>
      {children}
    </div>
  );
}

type PaymentAmountInputProps = {
  label: string;
  value: string;
  currency: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function PaymentAmountInput({
  label,
  value,
  currency,
  placeholder,
  onChange,
}: PaymentAmountInputProps) {
  return (
    <PaymentFormField label={label}>
      <InputGroup>
        <InputGroupAddon>
          <WalletCards className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={label}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <InputGroupAddon className="border-l border-zinc-200 px-3 pl-3 text-xs font-semibold uppercase tracking-normal text-zinc-500">
          {currency}
        </InputGroupAddon>
      </InputGroup>
    </PaymentFormField>
  );
}

type PaymentDatePickerProps = {
  label: string;
  value: string;
  locale: string;
  placeholder: string;
  clearLabel: string;
  onChange: (value: string) => void;
};

export function PaymentDatePicker({
  label,
  value,
  locale,
  placeholder,
  clearLabel,
  onChange,
}: PaymentDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateInputValue(value);

  return (
    <PaymentFormField label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={label}
            className={cn(
              "h-9 w-full justify-between px-3 text-left font-normal",
              !selectedDate && "text-zinc-400",
            )}
          >
            <span className="min-w-0 truncate">
              {selectedDate ? formatDate(selectedDate, locale) : placeholder}
            </span>
            <CalendarDays className="size-4 text-zinc-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateInputValue(date));
              setOpen(false);
            }}
            defaultMonth={selectedDate}
            locale={locale === "pl" ? pl : enUS}
          />
          <div className="border-t border-zinc-200 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {clearLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </PaymentFormField>
  );
}

function parseDateInputValue(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
