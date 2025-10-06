import { expect, test } from "@playwright/test";

test("renders dashboard and opens records form", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /the modern event relationship hub/i,
    })
  ).toBeVisible();

  await page.getByRole("button", { name: /add a record/i }).click();

  await expect(page.getByRole("tab", { name: /clients/i })).toBeVisible();
  await expect(page.getByLabel(/name \*/i)).toBeVisible();
});
