import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAuthSession() {
  const session = await getAuthSession();

  if (!session) {
    return {
      session: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    session,
    unauthorized: null,
  };
}
