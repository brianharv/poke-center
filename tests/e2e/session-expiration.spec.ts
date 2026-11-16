import { randomInt } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createVerifiedUser } from "./support/auth";
import { setSessionTimes } from "./support/session";

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `198.20.${randomInt(256)}.${randomInt(1, 255)}`,
  });
});

test("a server-authorized page renders without waiting for a browser session check", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/get-session*", async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.goto("/pokemon");
    await expect(
      page.getByText(`Signed in as ${user.email}`, { exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
});

test("an idle expired session returns to the current protected view and query after sign-in", async ({
  page,
  request,
}) => {
  await page.clock.install();
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  await page.goto("/pokemon?type=fire");
  await expect(
    page.getByRole("heading", { name: "Pokémon", exact: true }),
  ).toBeVisible();
  await page.goto("/development?panel=database&page=2");
  await expect(page.getByRole("status")).toHaveText("Database connected");
  const session = await (
    await page.request.get("/api/auth/get-session")
  ).json();
  await setSessionTimes(session.session.id, { expiresAt: new Date(0) });
  await page.clock.fastForward(60_000);
  await expect(page).toHaveURL(
    /\/\?returnTo=%2Fdevelopment%3Fpanel%3Ddatabase%26page%3D2$/,
  );
  const form = page.getByRole("form", { name: "Sign in", exact: true });
  await form.getByLabel("Email", { exact: true }).fill(user.email);
  await form.getByLabel("Password", { exact: true }).fill(user.password);
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/development\?panel=database&page=2$/);
  await expect(page.getByRole("status")).toHaveText("Database connected");
});

test("session checks do not renew inactivity but authenticated data use renews the persistent session", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  const initial = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  const lifetime =
    Date.parse(initial.session.expiresAt) -
    Date.parse(initial.session.createdAt);
  expect(lifetime).toBeGreaterThan(1_799_000);
  expect(lifetime).toBeLessThanOrEqual(1_800_000);
  const before = new Date(Date.now() + 20 * 60_000);
  await setSessionTimes(initial.session.id, { expiresAt: before });
  const check = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  expect(Date.parse(check.session.expiresAt)).toBe(before.getTime());
  const activity = await page.request.get("/api/trpc/viewer");
  expect(activity.ok()).toBe(true);
  expect(activity.headers()["set-cookie"]).toContain("session_token=");
  const after = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  expect(Date.parse(after.session.expiresAt)).toBeGreaterThan(
    before.getTime() + 5 * 60_000,
  );
  const cookie = (await page.context().cookies()).find((value) =>
    value.name.endsWith("session_token"),
  );
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
});

test("absolute lifetime rejects an otherwise live session and renewal cannot extend past its original sign-in", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  const initial = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  const absolute = 7 * 24 * 60 * 60_000;
  const cap = new Date(Date.now() + 10 * 60_000);
  await setSessionTimes(initial.session.id, {
    createdAt: new Date(cap.getTime() - absolute),
    expiresAt: new Date(Date.now() + 2 * 60_000),
  });
  const active = await page.request.get("/pokemon?type=water");
  expect(active.ok()).toBe(true);
  const renewed = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  expect(Date.parse(renewed.session.expiresAt)).toBeLessThanOrEqual(
    cap.getTime(),
  );
  await setSessionTimes(initial.session.id, {
    createdAt: new Date(Date.now() - absolute - 60_000),
    expiresAt: new Date(Date.now() + 20 * 60_000),
  });
  const expired = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  expect(expired === null).toBe(true);
  expect((await page.request.get("/api/trpc/viewer")).status()).toBe(401);
});

test("an older session cannot retain its previous longer inactivity expiry", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  const session = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  const lastRenewal = new Date(Date.now() - 10 * 60_000);
  await setSessionTimes(session.session.id, {
    createdAt: lastRenewal,
    updatedAt: lastRenewal,
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  const shortened = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  expect(Date.parse(shortened.session.expiresAt)).toBe(
    lastRenewal.getTime() + 30 * 60_000,
  );
  expect(Date.parse(shortened.session.updatedAt)).toBe(lastRenewal.getTime());
  await setSessionTimes(session.session.id, {
    createdAt: new Date(Date.now() - 45 * 60_000),
    updatedAt: new Date(Date.now() - 45 * 60_000),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  expect(
    (await (
      await page.request.get("/api/auth/get-session?disableRefresh=true")
    ).json()) === null,
  ).toBe(true);
});

test("focus detects a revoked open session and preserves the current query", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  await page.goto("/pokemon?type=grass&page=4");
  await expect(
    page.getByText(`Signed in as ${user.email}`, { exact: true }),
  ).toBeVisible();
  const session = await (
    await page.request.get("/api/auth/get-session?disableRefresh=true")
  ).json();
  expect(
    (
      await page.request.post("/api/auth/revoke-session", {
        headers: {
          origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        },
        data: { token: session.session.token },
      })
    ).ok(),
  ).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(
    /\/\?returnTo=%2Fpokemon%3Ftype%3Dgrass%26page%3D4$/,
  );
  await expect(
    page.getByText(`Signed in as ${user.email}`, { exact: true }),
  ).toHaveCount(0);
});

test("persistent cookies restore verified access in a fresh browser context", async ({
  page,
  request,
  browser,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  const state = await page.context().storageState();
  const persistent = state.cookies.filter(
    (cookie) => cookie.expires > Date.now() / 1000,
  );
  expect(
    persistent.some((cookie) => cookie.name.endsWith("session_token")),
  ).toBe(true);
  await page.context().close();
  const restarted = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    storageState: { cookies: persistent, origins: [] },
  });
  try {
    const restored = await restarted.newPage();
    await restored.goto("/pokemon?type=ice");
    await expect(
      restored.getByText(`Signed in as ${user.email}`, { exact: true }),
    ).toBeVisible();
  } finally {
    await restarted.close();
  }
});
