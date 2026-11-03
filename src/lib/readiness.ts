import { z } from "zod";

export const readinessSchema = z.object({
  status: z.literal("ready"),
  database: z.literal("connected"),
  initializedAt: z.iso.datetime(),
});
