"use client";

import Link from "next/link";

import { useI18n } from "@/i18n/provider";

type AccountViewProps = {
  name: string;
  email: string;
};

export function AccountView({ name, email }: AccountViewProps) {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 bg-zinc-50 p-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("account.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("account.subtitle")}</p>
      </header>
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <dl className="grid gap-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("account.name")}
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("account.email")}
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{email}</dd>
          </div>
        </dl>
      </section>
      <div>
        <Link
          href="/seating-plans"
          className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          {t("account.backToPlans")}
        </Link>
      </div>
    </main>
  );
}
