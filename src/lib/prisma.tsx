import { PrismaClient } from "@prisma/client";

declare global {
  // Only extend globalThis once in your entire project
  var prisma: PrismaClient | undefined;
}

function withConnectionTimeout(connectionString: string | undefined) {
  if (!connectionString) return undefined;

  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    // Keep Prisma's normal environment-based configuration if URL parsing fails.
    return undefined;
  }
}

const datasourceUrl = withConnectionTimeout(process.env.DATABASE_URL);

export const prisma =
  globalThis.prisma ||
  new PrismaClient(
    datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}
  );

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
