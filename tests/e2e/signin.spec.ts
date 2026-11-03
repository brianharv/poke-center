import { expect, test } from "@playwright/test";

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
