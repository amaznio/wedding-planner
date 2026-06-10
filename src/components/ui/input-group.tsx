"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-9 min-w-0 w-full items-center rounded-md border border-zinc-300 bg-white outline-none",
        "has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn("flex items-center pl-3 text-zinc-500 [&>svg]:pointer-events-none [&>svg:not([class*='size-'])]:size-4", className)}
      onClick={(event) => event.currentTarget.parentElement?.querySelector("input")?.focus()}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn("flex-1 rounded-none border-0 bg-transparent pl-2 shadow-none focus-visible:ring-0", className)}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
