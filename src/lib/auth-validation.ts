import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 16;
export const MAX_PASSWORD_LENGTH = 128;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, "Use at least 16 characters for your password.")
    .max(
      MAX_PASSWORD_LENGTH,
      "Use no more than 128 characters for your password.",
    ),
});

export const resendSchema = z.object({ email: emailSchema });
