"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "h-9 w-full rounded-md border border-zinc-300 bg-white px-3 pr-10 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({ className, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-100", className)}
      {...props}
    >
      <ChevronDown className="size-4" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxContent({
  className,
  container,
  sideOffset = 6,
  align = "start",
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "sideOffset" | "align"> &
  Pick<ComboboxPrimitive.Portal.Props, "container">) {
  return (
    <ComboboxPrimitive.Portal container={container}>
      <ComboboxPrimitive.Positioner sideOffset={sideOffset} align={align} className="isolate z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn("w-(--anchor-width) min-w-56 overflow-hidden rounded-md border border-zinc-200 bg-white text-zinc-900 shadow-md outline-none", className)}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("max-h-56 overflow-y-auto p-1", className)}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn("relative flex cursor-default items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-highlighted:bg-zinc-100", className)}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
        <Check className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-2 py-3 text-center text-sm text-zinc-500", className)}
      {...props}
    />
  );
}

export { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger };
