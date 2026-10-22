import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "@/generated/prisma/client";

const databaseGlobal = globalThis as unknown as { database?: PrismaClient };

export function getDatabase() {
  if (!databaseGlobal.database) {
    const connectionString = z.url().parse(process.env.DATABASE_URL);
    databaseGlobal.database = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: 5_000,
        query_timeout: 5_000,
        max: 5,
      }),
    });
  }
  return databaseGlobal.database;
}
