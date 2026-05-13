import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

if (!betterAuthUrl) {
  throw new Error("BETTER_AUTH_URL is required");
}

export const auth = betterAuth({
  appName: "Wedding Seating Planner",
  secret: betterAuthSecret,
  baseURL: betterAuthUrl,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
