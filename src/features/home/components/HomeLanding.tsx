"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { Armchair, FileText, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { HomeSeatingCanvas } from "./HomeSeatingCanvas";

function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22c-3.5-2.1-5-6.1-3.6-9.9l2.2-6.2 8.9 3.2-2.2 6.2c-1.4 3.8-5.2 6.2-9.3 5.7Z" />
      <path d="M12.3 29.5 15 22" />
      <path d="M6.7 34.2c3.2-1.3 6.8-1.1 9.8.7" />
      <path d="M33 22c3.5-2.1 5-6.1 3.6-9.9l-2.2-6.2-8.9 3.2 2.2 6.2c1.4 3.8 5.2 6.2 9.3 5.7Z" />
      <path d="M35.7 29.5 33 22" />
      <path d="M41.3 34.2c-3.2-1.3-6.8-1.1-9.8.7" />
      <path d="M22.5 11.5c1.1-1 2.2-1.5 3-1.5" />
      <path d="M25.5 16c-1.2.8-2.4 1.2-3.5 1.1" />
    </svg>
  );
}

function TableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 10h22" />
      <path d="M7 14h18" />
      <path d="M9 14 7.5 26" />
      <path d="M23 14 24.5 26" />
      <path d="M12 14v12" />
      <path d="M20 14v12" />
      <path d="M8 8h16l3 2H5l3-2Z" />
    </svg>
  );
}

function FeatureSeparator() {
  return <span aria-hidden="true" className="size-1 rounded-full bg-zinc-300" />;
}

export function HomeLanding() {
  const { t } = useI18n();

  const features = [
    { icon: UserRound, label: t("home.features.guests") },
    { icon: TableIcon, label: t("home.features.tables") },
    { icon: Armchair, label: t("home.features.seats") },
    { icon: FileText, label: t("home.features.pdfExport") },
  ];

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="h-16 border-b border-zinc-200 px-5 sm:px-8 lg:h-[72px]">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="size-8 shrink-0 text-violet-700" />
            <span className="text-xl font-semibold tracking-normal text-zinc-950">
              {t("home.brand")}
            </span>
          </div>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "shadow-sm",
            )}
          >
            {t("home.signIn")}
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col items-center justify-start gap-6 px-5 pt-8 pb-6 sm:px-8 sm:pt-10 lg:min-h-[calc(100vh-72px)] lg:pt-10 2xl:px-0">
        <div className="flex w-full max-w-[720px] flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <h1 className="max-w-[720px] text-[clamp(2.25rem,3vw,3rem)] leading-[1.12] font-bold tracking-normal text-zinc-950">
              {t("home.headline")}
            </h1>
            <p className="max-w-[560px] text-base leading-7 text-zinc-600 sm:text-lg">
              {t("home.description")}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ variant: "primary", size: "default" }),
                "h-10 px-5 shadow-[0_12px_24px_rgba(109,40,217,0.18)]",
              )}
            >
              {t("home.createWorkspace")}
            </Link>
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "h-10 px-5 shadow-sm",
              )}
            >
              {t("home.signIn")}
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-semibold text-zinc-950">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div key={feature.label} className="flex items-center gap-5">
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-6 shrink-0 text-violet-700" strokeWidth={1.9} />
                    <span>{feature.label}</span>
                  </div>
                  {index < features.length - 1 ? <FeatureSeparator /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full">
          <HomeSeatingCanvas />
        </div>
      </section>
    </main>
  );
}
