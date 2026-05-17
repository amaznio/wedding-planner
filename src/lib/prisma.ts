import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isAccelerateUrl = connectionString.startsWith("prisma+postgres://");
const adapter = isAccelerateUrl
  ? undefined
  : new PrismaPg({ connectionString });
const accelerateUrl = isAccelerateUrl ? connectionString : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    accelerateUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
