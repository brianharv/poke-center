import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { getReadiness } from "@/server/readiness";
import { readSession } from "@/server/session";
import { readinessSchema } from "@/lib/readiness";

const t = initTRPC.context<{ headers: Headers }>().create();

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await readSession(ctx.headers);
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({
    ctx: { viewer: { id: session.user.id, email: session.user.email } },
  });
});

export const appRouter = t.router({
  viewer: protectedProcedure.query(({ ctx }) => ctx.viewer),
  readiness: protectedProcedure
    .input(z.object({}).strict())
    .output(readinessSchema)
    .query(async () => {
      try {
        return await getReadiness();
      } catch {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Database unavailable. Check the database and migrations.",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;
