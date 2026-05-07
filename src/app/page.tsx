"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export default function Home() {
  const { t } = useI18n();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {t("home.title")}
        </h1>
        <div className="mt-6">
          <Link
            href="/seating-plans"
            className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {t("home.openEditor")}
          </Link>
        </div>
      </div>
    </main>
  );
}
