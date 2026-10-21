import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDatabase } from "@/server/database";

const t = initTRPC.create();

export const appRouter = t.router({
  // Public infrastructure check only. Future account procedures require auth.
  readiness: t.procedure
    .input(z.object({}).strict())
    .output(
      z.object({
        status: z.literal("ready"),
        database: z.literal("connected"),
        initializedAt: z.iso.datetime(),
      }),
    )
    .query(async () => {
      try {
        const check = await getDatabase().developmentCheck.findUniqueOrThrow({
          where: { id: 1 },
        });
        return {
          status: "ready" as const,
          database: "connected" as const,
          initializedAt: check.initializedAt.toISOString(),
        };
      } catch {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Database unavailable. Check the database and migrations.",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;
