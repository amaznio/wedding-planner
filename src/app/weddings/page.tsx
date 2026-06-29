"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Plus,
  Search,
  Store,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type WeddingListItem = {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
  access?: {
    canView?: boolean;
    canEdit?: boolean;
    canDeleteWedding?: boolean;
  } | null;
  _count: {
    events: number;
    guests: number;
    vendors: number;
    expenses: number;
  };
};

type ApiErrorResponse = {
  error?: string;
  details?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatWeddingDate(date: string | null) {
  if (!date) return "No date set";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No date set";

  return dateFormatter.format(parsed);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function weddingMatchesSearch(wedding: WeddingListItem, searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  return [wedding.name, wedding.location].some((value) => value?.toLowerCase().includes(query));
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    const fieldErrors = data.details?.fieldErrors
      ? Object.values(data.details.fieldErrors).flatMap((messages) => messages ?? [])
      : [];
    const messages = [...(data.details?.formErrors ?? []), ...fieldErrors];

    return messages[0] ?? data.error ?? fallback;
  } catch {
    return fallback;
  }
}

function CountMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-base font-semibold leading-5 text-zinc-950">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function WeddingCard({ wedding }: { wedding: WeddingListItem }) {
  const isActive = Boolean(wedding.date);
  const venue = wedding.location?.trim() || "No venue set";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm">
              <CalendarDays className="size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-xl font-semibold leading-7 text-zinc-950">{wedding.name}</h2>
                <Badge variant={isActive ? "success" : "default"}>{isActive ? "Active" : "Draft"}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {formatWeddingDate(wedding.date)}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" aria-hidden="true" />
                  <span className="break-words">{venue}</span>
                </span>
                <span>{pluralize(wedding._count.events, "event")}</span>
                <span>{pluralize(wedding._count.guests, "guest")}</span>
              </div>
            </div>
          </div>
        </div>

        <Link
          href={`/weddings/${wedding.id}`}
          className={cn(buttonVariants({ variant: "default" }), "h-11 w-full gap-2 sm:w-auto lg:min-w-36")}
        >
          Open wedding
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <CountMetric icon={CalendarDays} label="Events" value={wedding._count.events} />
        <CountMetric icon={Users} label="Guests" value={wedding._count.guests} />
        <CountMetric icon={Store} label="Vendors" value={wedding._count.vendors} />
        <CountMetric icon={CircleDollarSign} label="Expenses" value={wedding._count.expenses} />
      </div>
    </article>
  );
}

function WeddingListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Skeleton className="size-12 rounded-lg" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-6 w-64 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <Skeleton className="h-11 w-36" />
          </div>
          <div className="mt-5 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((__, statIndex) => (
              <Skeleton key={statIndex} className="h-10 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WeddingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [weddings, setWeddings] = useState<WeddingListItem[]>([]);
  const [createOpen, setCreateOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("create") === "1";
  });
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/weddings", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load weddings");
    const data = (await response.json()) as { weddings: WeddingListItem[] };
    setWeddings(data.weddings ?? []);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load weddings");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const clearCreateQuery = () => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("create") !== "1") return;

    searchParams.delete("create");
    const nextSearch = searchParams.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  };

  const filteredWeddings = useMemo(
    () => weddings.filter((wedding) => weddingMatchesSearch(wedding, searchQuery)),
    [searchQuery, weddings],
  );

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const weddingName = name.trim();
    const weddingLocation = location.trim();
    if (!weddingName) {
      setCreateError("Enter a wedding name first.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setCreateError(null);
    try {
      const response = await fetch("/api/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: weddingName,
          currency: "PLN",
          ...(date ? { date } : {}),
          ...(weddingLocation ? { location: weddingLocation } : {}),
        }),
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Failed to create wedding"));
      setName("");
      setDate("");
      setLocation("");
      setCreateOpen(false);
      clearCreateQuery();
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create wedding");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">Weddings</h1>
            <p className="mt-3 text-base leading-7 text-zinc-600">
              Manage weddings, guests, events, vendors, and expenses in one place.
            </p>
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open && !isSaving) {
                setName("");
                setDate("");
                setLocation("");
                setCreateError(null);
                clearCreateQuery();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-11 w-full shrink-0 sm:w-auto">
                <Plus data-icon="inline-start" />
                New wedding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0">
              <DialogHeader className="border-b border-zinc-200 px-6 py-5">
                <DialogTitle className="text-2xl leading-8">Create wedding</DialogTitle>
                <DialogDescription className="max-w-xl leading-6">
                  Add the core wedding details. You can edit these later in settings.
                </DialogDescription>
              </DialogHeader>

              <form className="flex flex-col" onSubmit={onCreate}>
                <div className="flex flex-col gap-5 px-6 py-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-900" htmlFor="wedding-name">
                      Wedding name
                    </label>
                    <Input
                      id="wedding-name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (createError) setCreateError(null);
                      }}
                      placeholder="Adrian and Gabriela's Wedding"
                      aria-invalid={Boolean(createError)}
                      autoFocus
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900" htmlFor="wedding-date">
                        Date
                      </label>
                      <Input id="wedding-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900" htmlFor="wedding-location">
                        Venue
                      </label>
                      <Input
                        id="wedding-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Venue or city"
                      />
                    </div>
                  </div>

                  {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
                </div>

                <DialogFooter className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSaving}>
                    <Plus data-icon="inline-start" />
                    {isSaving ? "Creating..." : "Create wedding"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search weddings..."
            aria-label="Search weddings"
            className="h-11 pl-9"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {isLoading ? (
          <WeddingListSkeleton />
        ) : weddings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
                <CalendarDays className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">No weddings yet</h2>
                <p className="mt-1 text-sm text-zinc-600">Create your first wedding to start planning guests, events, vendors, and expenses.</p>
              </div>
            </div>
          </div>
        ) : filteredWeddings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-zinc-950">No matching weddings</h2>
            <p className="mt-1 text-sm text-zinc-600">Try a different search term or clear the search field.</p>
          </div>
        ) : (
          <section className="flex flex-col gap-4" aria-label="Wedding list">
            {filteredWeddings.map((wedding) => (
              <WeddingCard key={wedding.id} wedding={wedding} />
            ))}
            <p className="pt-2 text-center text-sm text-zinc-500">
              Showing {filteredWeddings.length} of {weddings.length} weddings
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
