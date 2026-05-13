import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AccountView } from "@/features/auth/components/AccountView";
import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in?next=/account");
  }

  return (
    <AccountView
      name={session.user.name ?? session.user.email ?? ""}
      email={session.user.email ?? ""}
    />
  );
}
