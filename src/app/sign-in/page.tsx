import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { SignInForm } from "@/features/auth/components/SignInForm";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/seating-plans");
  }

  return <SignInForm />;
}
