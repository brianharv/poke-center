import { expect, test } from "@playwright/test";
import { createVerifiedUser } from "./support/auth";

test("a developer can verify the app's database connection in the browser", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  expect(
    (await page.request.post("/api/auth/sign-in/email", { data: user })).ok(),
  ).toBe(true);
  await page.goto("/development");
  await expect(
    page.getByRole("heading", { name: "Poké Center" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Database connected");
  const initialization = page.getByTestId("database-initialized-at");
  await expect(initialization).toHaveText(/Database initialized: \d{4}-/);
  const initialText = await initialization.textContent();
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Database connected");
  await expect(initialization).toHaveText(initialText!);
});
