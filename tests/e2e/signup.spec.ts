import { createHmac, randomInt, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

// Simulate a separate proxied client per run so rate-limit tests can be rerun.
const TEST_CLIENT_IP = `198.18.${randomInt(256)}.${randomInt(1, 255)}`;
test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_CLIENT_IP } });

test("the signup form stays safe while client scripts load", async ({
  page,
}) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route(/\/_next\/.*\.js(?:\?|$)/, async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeDisabled();
    releaseScripts();
    await page.getByLabel("Email", { exact: true }).fill("invalid");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("Enter a valid email address.", { exact: true }),
    ).toBeVisible();
  } finally {
    releaseScripts();
  }
});

async function verificationLink(
  request: APIRequestContext,
  email: string,
  minimumMessages = 1,
) {
  const inboxURL = process.env.MAILPIT_API_URL ?? "http://localhost:8025";
  let messageID = "";
  await expect
    .poll(async () => {
      const response = await request.get(`${inboxURL}/api/v1/search`, {
        params: { query: `to:${email}` },
      });
      expect(response.ok()).toBe(true);
      const inbox = await response.json();
      messageID =
        inbox.messages?.length >= minimumMessages ? inbox.messages[0].ID : "";
      return messageID;
    })
    .not.toBe("");
  const response = await request.get(`${inboxURL}/api/v1/message/${messageID}`);
  const message = await response.json();
  const url = message.Text.match(/https?:\/\/\S+/)?.[0];
  if (!url) throw new Error("Verification email did not contain a link.");
  return url as string;
}

test("a visitor signs up with email and password and verifies the email link", async ({
  page,
  request,
}) => {
  const email = `signup-${randomUUID()}@example.test`;
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a long passphrase for testing");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  const unverifiedSignIn = await request.post("/api/auth/sign-in/email", {
    data: { email, password: "a long passphrase for testing" },
  });
  expect(unverifiedSignIn.status()).toBe(403);
  expect(await (await request.get("/api/auth/get-session")).json()).toBeNull();

  const verificationURL = await verificationLink(request, email);
  await page.goto(verificationURL);
  await expect(
    page.getByRole("heading", { name: "Email verified" }),
  ).toBeVisible();

  const signIn = await request.post("/api/auth/sign-in/email", {
    data: { email, password: "a long passphrase for testing" },
  });
  expect(signIn.ok()).toBe(true);
  const session = await (await request.get("/api/auth/get-session")).json();
  expect(session.user.email).toBe(email);
  expect(session.user.emailVerified).toBe(true);
});

test("signup validates email and the 15/16-character boundary on client and server", async ({
  page,
  request,
}) => {
  const email = `boundary-${randomUUID()}@example.test`;
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByLabel("Password", { exact: true }).fill("123456789012345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Enter a valid email address.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Use at least 16 characters for your password.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/auth/sign-up/email", {
        data: { email, password: "123456789012345" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/auth/sign-up/email", {
        data: { email: "invalid", password: "1234567890123456" },
      })
    ).status(),
  ).toBe(400);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("1234567890123456");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
});

test("invalid and expired links can be recovered through a throttled resend", async ({
  page,
  request,
}) => {
  const email = `resend-${randomUUID()}@example.test`;
  expect(
    (
      await request.post("/api/auth/sign-up/email", {
        data: { email, password: "another long passphrase" },
      })
    ).ok(),
  ).toBe(true);
  await verificationLink(request, email);
  const callback = encodeURIComponent("/verify-email?result=success");
  await page.goto(
    `/api/auth/verify-email?token=invalid&callbackURL=${callback}`,
  );
  await expect(
    page.getByRole("heading", { name: "Verification link unavailable" }),
  ).toBeVisible();

  const secret =
    process.env.BETTER_AUTH_SECRET ||
    readFileSync(".env", "utf8").match(/^BETTER_AUTH_SECRET=(.+)$/m)?.[1];
  if (!secret)
    throw new Error(
      "Initialize the local auth environment before testing expired links.",
    );
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({ email, iat: 1, exp: 2 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  await page.goto(
    `/api/auth/verify-email?token=${header}.${payload}.${signature}&callbackURL=${callback}`,
  );
  await expect(page).toHaveURL(/error=TOKEN_EXPIRED/);
  await expect(
    page.getByRole("heading", { name: "Verification link unavailable" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Resend verification email", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "If this email needs verification, a link has been sent.",
  );
  await expect(
    page.getByRole("button", { name: /Resend verification email \(/ }),
  ).toBeDisabled();
  const link = await verificationLink(request, email, 2);
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Email verified" }),
  ).toBeVisible();
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Email verified" }),
  ).toBeVisible();

  const unknown = await request.post("/api/auth/send-verification-email", {
    data: { email: `unknown-${randomUUID()}@example.test` },
  });
  const verified = await request.post("/api/auth/send-verification-email", {
    data: { email },
  });
  expect(unknown.status()).toBe(200);
  expect(verified.status()).toBe(200);
  expect(await unknown.json()).toEqual(await verified.json());
});

test("repeated signup stays generic and does not replace an existing account", async ({
  page,
  request,
}) => {
  const email = `duplicate-${randomUUID()}@example.test`;
  const password = "my original long passphrase";
  const signup = await request.post("/api/auth/sign-up/email", {
    data: { email, password, name: "Untrusted name", emailVerified: true },
  });
  expect(signup.ok()).toBe(true);
  const original = await signup.json();
  expect(original.user.name).toBe("Trainer");
  expect(original.user.emailVerified).toBe(false);
  const link = await verificationLink(request, email);
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Email verified" }),
  ).toBeVisible();
  const repeated = await request.post("/api/auth/sign-up/email", {
    data: {
      email: email.toUpperCase(),
      password: "a different long passphrase",
    },
  });
  expect(repeated.status()).toBe(200);
  expect((await repeated.json()).user.emailVerified).toBe(false);
  const signIn = await request.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  expect(signIn.ok()).toBe(true);
  expect((await signIn.json()).user.id).toBe(original.user.id);
});

test("verification email requests are limited by the server", async ({
  request,
}) => {
  const statuses: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    const response = await request.post("/api/auth/send-verification-email", {
      data: { email: `limited-${randomUUID()}@example.test` },
    });
    statuses.push(response.status());
    if (response.status() === 429) {
      expect(Number(response.headers()["x-retry-after"])).toBeGreaterThan(0);
    }
  }
  expect(statuses).toContain(429);
  expect(statuses.at(-1)).toBe(429);
});
