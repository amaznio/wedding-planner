import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AppDataTableColumn<T extends string> = {
  key: T;
  label: string;
  align?: "left" | "right";
};

type AppDataTableRow<T extends string> = Record<T, ReactNode> & { id: string };

type AppDataTableProps<T extends string> = {
  columns: Array<AppDataTableColumn<T>>;
  rows: Array<AppDataTableRow<T>>;
  emptyLabel: string;
  variant?: "section" | "standalone";
};

export function AppDataTable<T extends string>({
  columns,
  rows,
  emptyLabel,
  variant = "section",
}: AppDataTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-white",
        variant === "standalone" ? "rounded-lg border border-zinc-200 shadow-sm" : "rounded-md border-y border-zinc-200",
      )}
    >
      <Table>
        <TableHeader className="bg-zinc-50/80">
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn("h-11 whitespace-nowrap px-4", column.align === "right" ? "text-right" : "text-left")}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn("px-4 py-3.5", column.align === "right" ? "text-right" : "text-left")}
                >
                  {row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-16 text-center text-sm text-zinc-500">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
