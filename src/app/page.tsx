import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user.id) {
    const wedding = await prisma.wedding.findFirst({
      where: { memberships: { some: { userId: session.user.id } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (wedding) {
      redirect(`/weddings/${wedding.id}`);
    }

    redirect("/weddings");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">WeddingPlan</h1>
        <div className="mt-6">
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/sign-in"
              className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
