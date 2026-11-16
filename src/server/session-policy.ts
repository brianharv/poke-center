import "server-only";
import { z } from "zod";

const sessionPolicySchema = z
  .object({
    SESSION_IDLE_SECONDS: z.coerce.number().int().min(60).default(1_800),
    SESSION_RENEWAL_SECONDS: z.coerce.number().int().positive().default(300),
    SESSION_ABSOLUTE_SECONDS: z.coerce.number().int().min(60).default(604_800),
    SESSION_CHECK_SECONDS: z.coerce.number().int().min(5).max(300).default(60),
  })
  .refine(
    (value) => value.SESSION_RENEWAL_SECONDS < value.SESSION_IDLE_SECONDS,
    {
      message:
        "Session renewal interval must be shorter than the inactivity window.",
    },
  );

export function getSessionPolicy() {
  return sessionPolicySchema.parse(process.env);
}
