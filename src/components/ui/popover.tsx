import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portalled = true,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalled?: boolean;
}) {
  const content = (
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border border-zinc-200 bg-white p-3 text-zinc-900 shadow-md outline-none",
        className,
      )}
      {...props}
    />
  );

  if (!portalled) {
    return content;
  }

  return (
    <PopoverPrimitive.Portal>
      {content}
    </PopoverPrimitive.Portal>
  );
}
