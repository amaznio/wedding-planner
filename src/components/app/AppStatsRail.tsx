import { cn } from "@/lib/utils";

export type AppStatsRailItem = {
  label: string;
  value: string | number;
};

type AppStatsRailProps = {
  items: AppStatsRailItem[];
  className?: string;
};

export function AppStatsRail({ items, className }: AppStatsRailProps) {
  return (
    <dl className={cn("flex flex-wrap items-center gap-y-2", className)}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex min-w-0 items-baseline gap-1.5 border-l border-zinc-300 px-4 first:border-l-0 first:pl-0 last:pr-0"
        >
          <dt className="order-2 text-sm leading-5 text-zinc-500">{item.label}</dt>
          <dd className="order-1 text-base font-semibold leading-5 text-zinc-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
