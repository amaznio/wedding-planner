"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col gap-4",
        month: "space-y-4",
        month_caption: "relative flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold text-zinc-900",
        nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        button_previous:
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40",
        button_next:
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40",
        chevron: "pointer-events-none size-4",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-center text-[0.8rem] font-medium text-zinc-500",
        week: "mt-1 flex w-full",
        day: "relative size-9 p-0 text-center text-sm",
        day_button:
          "flex size-9 items-center justify-center rounded-md text-sm font-normal text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
        today: "[&>button]:bg-zinc-100 [&>button]:text-zinc-900",
        selected: "[&>button]:bg-violet-600 [&>button]:text-white [&>button]:hover:bg-violet-600",
        outside: "[&>button]:text-zinc-400",
        disabled: "[&>button]:text-zinc-300 [&>button]:opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
