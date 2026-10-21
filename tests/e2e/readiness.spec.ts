import { expect, test } from "@playwright/test";

test("a developer can verify the app's database connection in the browser", async ({
  page,
}) => {
  await page.goto("/");
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
