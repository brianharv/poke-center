import "server-only";
import { after } from "next/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError, createAuthMiddleware } from "better-auth/api";
import nodemailer from "nodemailer";
import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  signupSchema,
  resendSchema,
} from "@/lib/auth-validation";
import { getDatabase } from "@/server/database";

const VERIFICATION_TTL_SECONDS = 60 * 60;

const configurationSchema = z.object({
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(1),
});

function createAuth() {
  const configuration = configurationSchema.parse(process.env);
  const transport = nodemailer.createTransport({
    host: configuration.SMTP_HOST,
    port: configuration.SMTP_PORT,
    secure: false,
    connectionTimeout: 5_000,
    socketTimeout: 10_000,
  });

  return betterAuth({
    appName: "Poké Center",
    baseURL: configuration.BETTER_AUTH_URL,
    secret: configuration.BETTER_AUTH_SECRET,
    database: prismaAdapter(getDatabase(), {
      provider: "postgresql",
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: VERIFICATION_TTL_SECONDS,
      async sendVerificationEmail({ user, url }) {
        await transport.sendMail({
          from: configuration.SMTP_FROM,
          to: user.email,
          subject: "Verify your Poké Center email",
          text: `Verify your email address by opening this link:\n\n${url}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
        });
      },
    },
    session: { cookieCache: { enabled: false } },
    account: { accountLinking: { enabled: false } },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-up/email": { window: 60, max: 20 },
        "/send-verification-email": { window: 60, max: 5 },
        "/verify-email": { window: 60, max: 30 },
      },
    },
    advanced: {
      backgroundTasks: {
        handler(promise) {
          after(async () => {
            await promise.catch(() => {
              console.error("Authentication background task failed.");
            });
          });
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const parsed = signupSchema.safeParse(ctx.body);
          if (!parsed.success) {
            throw new APIError("BAD_REQUEST", {
              message: parsed.error.issues[0].message,
            });
          }
          return {
            context: {
              ...ctx,
              body: {
                ...parsed.data,
                name: "Trainer",
                callbackURL: "/verify-email?result=success",
              },
            },
          };
        }
        if (ctx.path === "/send-verification-email") {
          const parsed = resendSchema.safeParse(ctx.body);
          if (!parsed.success) {
            throw new APIError("BAD_REQUEST", {
              message: "Enter a valid email address.",
            });
          }
          return {
            context: {
              ...ctx,
              body: {
                ...parsed.data,
                callbackURL: "/verify-email?result=success",
              },
            },
          };
        }
      }),
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  auth ??= createAuth();
  return auth;
}
