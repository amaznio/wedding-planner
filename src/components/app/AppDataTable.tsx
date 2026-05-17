import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
};

export function AppDataTable<T extends string>({ columns, rows, emptyLabel }: AppDataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.align === "right" ? "text-right" : "text-left"}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.align === "right" ? "text-right" : "text-left"}>
                  {row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-sm text-zinc-500">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
