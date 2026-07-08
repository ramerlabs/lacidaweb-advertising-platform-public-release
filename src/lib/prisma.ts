import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const REQUIRED_MODELS = ["paymentSettings", "siteSettings", "integrationSettings"] as const;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasModelDelegate(client: PrismaClient, model: string) {
  const delegate = (client as unknown as Record<string, unknown>)[model];
  return Boolean(delegate && typeof (delegate as { findUnique?: unknown }).findUnique === "function");
}

function isClientFresh(client: PrismaClient) {
  return REQUIRED_MODELS.every((model) => hasModelDelegate(client, model));
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && isClientFresh(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

/** Always resolves to the latest Prisma client (avoids stale hot-reload instances). */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<PropertyKey, unknown>)[property];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
