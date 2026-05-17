"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/i18n/provider";

const signUpSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export function SignUpForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validated = signUpSchema.safeParse({ name, email, password });
    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      const hasNameError = Boolean(fieldErrors.name?.length);
      const hasEmailError = Boolean(fieldErrors.email?.length);
      const hasPasswordError = Boolean(fieldErrors.password?.length);
      setError(
        hasNameError
          ? t("auth.errors.nameMinLength")
          : hasEmailError
            ? t("auth.errors.invalidEmail")
            : hasPasswordError
              ? t("auth.errors.passwordMinLength")
              : t("auth.errors.invalidPayload"),
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { error: signUpError } = await authClient.signUp.email({
      name: validated.data.name,
      email: validated.data.email,
      password: validated.data.password,
    });

    if (signUpError) {
      setError(t("auth.errors.signUpFailed"));
      setIsSubmitting(false);
      return;
    }

    router.push("/weddings");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-zinc-900">{t("auth.signUp.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("auth.signUp.subtitle")}</p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700" htmlFor="sign-up-name">
              {t("auth.fields.name")}
            </label>
            <Input
              id="sign-up-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("auth.placeholders.name")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700" htmlFor="sign-up-email">
              {t("auth.fields.email")}
            </label>
            <Input
              id="sign-up-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.placeholders.email")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700" htmlFor="sign-up-password">
              {t("auth.fields.password")}
            </label>
            <Input
              id="sign-up-password"
              type="password"
              autoComplete="new-password"
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
            {isSubmitting ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          {t("auth.signUp.haveAccount")}{" "}
          <Link className="font-medium text-zinc-900 underline underline-offset-2" href="/sign-in">
            {t("auth.signUp.signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}

