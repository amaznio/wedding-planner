import { headers } from "next/headers";
import { HomeLanding } from "@/features/home/components/HomeLanding";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return <HomeLanding isAuthenticated={Boolean(session?.user.id)} />;
}
