import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/weddings");
  }

  return <SignUpForm />;
}

