import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/features/home/components/HomeLanding";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user.id) {
    const weddings = await prisma.wedding.findMany({
      where: { memberships: { some: { userId: session.user.id } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
      take: 2,
    });

    if (weddings.length === 1) {
      redirect(`/weddings/${weddings[0].id}`);
    }

    redirect("/weddings");
  }

  return <HomeLanding />;
}
