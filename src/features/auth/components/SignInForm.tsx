"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/i18n/provider";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function SignInForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const next = searchParams.get("next");
  const nextPath = next?.startsWith("/") ? next : "/weddings";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validated = signInSchema.safeParse({ email, password });
    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      const hasEmailError = Boolean(fieldErrors.email?.length);
      const hasPasswordError = Boolean(fieldErrors.password?.length);
      setError(
        hasEmailError
          ? t("auth.errors.invalidEmail")
          : hasPasswordError
            ? t("auth.errors.passwordMinLength")
            : t("auth.errors.invalidPayload"),
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (signInError) {
      setError(t("auth.errors.invalidCredentials"));
      setIsSubmitting(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-zinc-900">{t("auth.signIn.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("auth.signIn.subtitle")}</p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700" htmlFor="sign-in-email">
              {t("auth.fields.email")}
            </label>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.placeholders.email")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700" htmlFor="sign-in-password">
              {t("auth.fields.password")}
            </label>
            <Input
              id="sign-in-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.placeholders.password")}
            />
          </div>
          {error ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          {t("auth.signIn.noAccount")}{" "}
          <Link className="font-medium text-zinc-900 underline underline-offset-2" href="/sign-up">
            {t("auth.signIn.createAccount")}
          </Link>
        </p>
      </div>
    </main>
  );
}

