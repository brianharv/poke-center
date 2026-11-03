import { expect, test } from "@playwright/test";
import { randomInt } from "node:crypto";
import { createVerifiedUser } from "./support/auth";
import { randomUUID } from "node:crypto";

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `198.19.${randomInt(256)}.${randomInt(1, 255)}`,
  });
});

test("revoking a database session rejects its retained cookie on the next page and API requests", async ({
  page,
  request,
  browser,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  await page.goto("/pokemon?type=water");
  await expect(
    page.getByText(`Signed in as ${user.email}`, { exact: true }),
  ).toBeVisible();
  const session = await (
    await page.request.get("/api/auth/get-session")
  ).json();
  const cookie = (await page.context().cookies()).find((value) =>
    value.name.endsWith("session_token"),
  );
  const other = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: {
      "x-forwarded-for": `198.19.${randomInt(256)}.${randomInt(1, 255)}`,
    },
  });
  try {
    expect(
      (
        await other.request.post("/api/auth/sign-in/email", { data: user })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await other.request.post("/api/auth/revoke-session", {
          headers: {
            origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
          },
          data: { token: session.session.token },
        })
      ).ok(),
    ).toBe(true);
    const denied = await page.request.get("/api/trpc/viewer");
    expect(denied.status()).toBe(401);
    expect((await denied.text()).includes(user.email)).toBe(false);
    const retained = (await page.context().cookies()).find(
      (value) => value.name === cookie?.name,
    );
    expect(Boolean(cookie && retained?.value === cookie.value)).toBe(true);
    const navigation = await page.request.get("/pokemon?type=water", {
      maxRedirects: 0,
    });
    expect(navigation.status()).toBe(307);
    expect(navigation.headers().location).toMatch(
      /\/\?returnTo=%2Fpokemon%3Ftype%3Dwater$/,
    );
    expect((await navigation.text()).includes(user.email)).toBe(false);
  } finally {
    await other.close();
  }
});

test("a protected direct link returns a visitor to sign-in with its query intact", async ({
  page,
}) => {
  await page.goto("/pokemon?type=fire&page=2");
  await expect(page).toHaveURL(
    /\/\?returnTo=%2Fpokemon%3Ftype%3Dfire%26page%3D2$/,
  );
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pokémon", exact: true }),
  ).toHaveCount(0);
});

test("a verified trainer signs in and resumes the protected direct link", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  await page.goto("/pokemon?type=fire&page=2");
  const form = page.getByRole("form", { name: "Sign in", exact: true });
  await form.getByLabel("Email", { exact: true }).fill(user.email);
  await form.getByLabel("Password", { exact: true }).fill(user.password);
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/pokemon\?type=fire&page=2$/);
  await expect(
    page.getByRole("heading", { name: "Pokémon", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Signed in as ${user.email}`, { exact: true }),
  ).toBeVisible();
  const cookies = await page.context().cookies();
  const cookie = cookies.find((value) => value.name.endsWith("session_token"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(cookie?.secure).toBe(false);
});

test("application data rejects anonymous requests while infrastructure health stays public", async ({
  request,
}) => {
  const response = await request.get("/api/trpc/readiness", {
    params: { input: "{}" },
  });
  expect(response.status()).toBe(401);
  expect((await response.json()).error.data.code).toBe("UNAUTHORIZED");
  expect((await request.get("/api/health")).ok()).toBe(true);
});

test("sign-out revokes the session and keeps private history and the next account isolated", async ({
  page,
  request,
}) => {
  const first = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: first })).ok(),
  ).toBe(true);
  await page.goto("/pokemon?type=water");
  await expect(
    page.getByText(`Signed in as ${first.email}`, { exact: true }),
  ).toBeVisible();
  await page.goto("/pokemon?type=fire");
  const cookies = await page.context().cookies();
  const signOut = page.getByRole("button", { name: "Sign out", exact: true });
  await expect(signOut).toBeVisible();
  await signOut.click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await (await page.request.get("/api/auth/get-session")).json(),
  ).toBeNull();
  const denied = await request.get("/api/trpc/viewer", {
    headers: {
      cookie: cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
    },
  });
  expect(denied.status()).toBe(401);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Signed in as ${first.email}`, { exact: true }),
  ).toBeHidden();
  const second = await createVerifiedUser(request);
  await page.goto("/");
  const form = page.getByRole("form", { name: "Sign in", exact: true });
  await form.getByLabel("Email", { exact: true }).fill(second.email);
  await form.getByLabel("Password", { exact: true }).fill(second.password);
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/pokemon$/);
  await expect(
    page.getByText(`Signed in as ${second.email}`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Signed in as ${first.email}`, { exact: true }),
  ).toHaveCount(0);
});

test("sign-in failures are accessible and do not distinguish unknown from unverified accounts", async ({
  page,
  request,
}) => {
  const user = {
    email: `unverified-${randomUUID()}@example.test`,
    password: "an unverified trainer password",
  };
  expect(
    (await request.post("/api/auth/sign-up/email", { data: user })).ok(),
  ).toBe(true);
  await page.goto("/");
  const form = page.getByRole("form", { name: "Sign in", exact: true });
  await form.getByLabel("Email", { exact: true }).fill("invalid");
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText(
    "Enter a valid email address and your password.",
  );
  for (const email of [user.email, `missing-${randomUUID()}@example.test`]) {
    await form.getByLabel("Email", { exact: true }).fill(email);
    await form.getByLabel("Password", { exact: true }).fill(user.password);
    await form.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(form.getByRole("alert")).toHaveText(
      "Unable to sign in. Check your email and password, and verify your email address.",
    );
    expect(
      await (await page.request.get("/api/auth/get-session")).json(),
    ).toBeNull();
  }
  const verified = await createVerifiedUser(request);
  await form.getByLabel("Email", { exact: true }).fill(verified.email);
  await form
    .getByLabel("Password", { exact: true })
    .fill("an incorrect long password");
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText(
    "Unable to sign in. Check your email and password, and verify your email address.",
  );
});

test("unsafe return destinations fall back to the protected list without redirect loops", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const user = await createVerifiedUser(request);
  for (const destination of [
    "https://example.com/",
    "//example.com/",
    "/\\example.com/",
    "/api/auth/sign-in/email",
    "/verify-email?result=success",
    "/",
    "/pokemon/../api/auth/get-session",
    "/pokemon?query=%ZZ",
    "/pokemon?query=hello%0aworld",
    "/pokemon#fragment",
  ]) {
    await page.context().clearCookies();
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": `198.19.${randomInt(256)}.${randomInt(1, 255)}`,
    });
    await page.goto(`/?${new URLSearchParams({ returnTo: destination })}`);
    const form = page.getByRole("form", { name: "Sign in", exact: true });
    await form.getByLabel("Email", { exact: true }).fill(user.email);
    await form.getByLabel("Password", { exact: true }).fill(user.password);
    await form.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/pokemon$/);
    await expect(
      page.getByRole("heading", { name: "Pokémon", exact: true }),
    ).toBeVisible();
  }
});

test("password sign-in is rate limited on the server with accessible retry feedback", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "Sign in", exact: true });
  const data = {
    email: `limited-${randomUUID()}@example.test`,
    password: "an incorrect long password",
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect(
      (await page.request.post("/api/auth/sign-in/email", { data })).status(),
    ).toBe(401);
  }
  await form.getByLabel("Email", { exact: true }).fill(data.email);
  await form.getByLabel("Password", { exact: true }).fill(data.password);
  await form.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText(
    "Too many sign-in attempts. Please wait a minute and try again.",
  );
});
