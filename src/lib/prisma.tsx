import { PrismaClient } from "@prisma/client";

declare global {
  // Only extend globalThis once in your entire project
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
