import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Neon serverless drops idle connections; retry once on the specific "Closed" error.
type PrismaQueryFn<T> = () => Promise<T>;

export async function withRetry<T>(fn: PrismaQueryFn<T>, attempts = 2): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isClosedConnection = msg.includes("kind: Closed") || msg.includes("SocketTimeout") || msg.includes("connection closed");
      if (isClosedConnection && i < attempts - 1) {
        console.warn("[db] Connection closed, reconnecting…");
        await db.$disconnect().catch(() => {});
        await db.$connect().catch(() => {});
        continue;
      }
      throw err;
    }
  }
  // unreachable, but TypeScript needs this
  throw new Error("withRetry exhausted");
}
