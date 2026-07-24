"use client";

import { useMemo, useState } from "react";
import { Check, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  disabled?: boolean;
  minuteStep?: number;
  ariaLabel?: string;
  className?: string;
};

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  clearLabel = "Clear time",
  disabled = false,
  minuteStep = 60,
  ariaLabel,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => buildTimeOptions(minuteStep), [minuteStep]);
  const displayValue = isTimeValue(value) ? value : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 text-left font-normal",
            !displayValue && "text-zinc-400",
            className,
          )}
        >
          <span className="min-w-0 truncate">{displayValue || placeholder}</span>
          <Clock3 className="size-4 text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" portalled={false} className="w-48 p-0">
        <div className="max-h-64 overflow-y-auto overscroll-contain">
          <div className="grid gap-1 p-1">
            {options.map((option) => (
              <Button
                key={option}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 justify-start px-2 font-normal",
                  option === displayValue && "bg-violet-50 text-violet-700 hover:bg-violet-50 hover:text-violet-700",
                )}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span className="w-10 text-left tabular-nums">{option}</span>
                {option === displayValue ? <Check className="ml-auto size-4" /> : null}
              </Button>
            ))}
          </div>
        </div>
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
  );
}

function buildTimeOptions(minuteStep: number): string[] {
  const step = Number.isFinite(minuteStep) && minuteStep > 0 && minuteStep <= 60 ? Math.trunc(minuteStep) : 60;
  const options: string[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += step) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }

  return options;
}

function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
