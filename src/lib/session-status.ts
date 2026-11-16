import { z } from "zod";

export const sessionStatusSchema = z
  .object({
    user: z.object({ id: z.string(), emailVerified: z.boolean() }),
  })
  .nullable();
