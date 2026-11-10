import { expect, test } from "@playwright/test";

test.describe("repair guide player", () => {
  test("library shows clear status and opens a draft guide", async ({ page }) => {
    await page.goto("/guides");
    await expect(page.getByRole("heading", { name: /Clear steps/i })).toBeVisible();
    await expect(page.getByText(/No guides are currently marked published/i)).toBeVisible();

    await expect(page.locator(".guide-library-card")).toHaveCount(8);
    const card = page.locator(".guide-library-card").filter({ hasText: "Inspect a flat tire and replace a conventional inner tube" });
    await card.getByRole("link", { name: "Open guide" }).click();
    await expect(page).toHaveURL(/\/guides\/flat-tire-inner-tube$/);
    await expect(page.getByText(/Draft · not verified repair advice/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Guide overview" })).toBeVisible();
  });

  test("player fixtures are not exposed as public repair-guide routes", async ({ page }) => {
    await page.goto("/guides/phase-06-brake-inspection");
    await expect(page.getByRole("heading", { name: /Looks like this/i })).toBeVisible();
    await page.goto("/guides/phase-06-flat-tire-media-fallback");
    await expect(page.getByRole("heading", { name: /Looks like this/i })).toBeVisible();
  });

  test("content inventory distinguishes linked sources from qualified mechanical review", async ({ page }) => {
    await page.goto("/guides/content-inventory");
    await expect(page.getByRole("heading", { name: "Content inventory" })).toBeVisible();
    await expect(page.locator(".guide-inventory-card")).toHaveCount(8);
    await expect(page.locator(".guide-inventory-summary article").nth(2)).toContainText("0");
    await expect(page.locator(".guide-inventory-summary article").nth(2)).toContainText("Qualified reviews recorded");
    await expect(page.getByText(/Qualified mechanical review has not been recorded/i).first()).toBeVisible();
    await expect(page.getByText(/Publication gate is still closed/i)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  });

  test("unknown guide slugs return the not-found page", async ({ page }) => {
    await page.goto("/guides/not-a-real-guide");
    await expect(page.getByRole("heading", { name: /Looks like this/i })).toBeVisible();
  });
});
