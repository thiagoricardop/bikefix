import { expect, test, type TestInfo } from "@playwright/test";

test("home page communicates the BikeFix product clearly", async ({ page }, testInfo: TestInfo) => {
  const isMobile = testInfo.project.name.includes("mobile");
  await page.goto("/");

  await expect(page).toHaveTitle(/BikeFix/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Less guessing.");
  await expect(page.getByRole("heading", { name: "Road bike" })).toBeVisible();
  await expect(page.locator("#interactive-explorer").getByRole("heading", { name: "Mountain bike", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /suggest a repair guide/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /privacy notice/i })).toBeVisible();

  if (isMobile) {
    const menu = page.locator("details.mobile-nav");
    await menu.locator("summary").click();
    await expect(menu.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Bike types" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }
});

test("desktop navigation reaches the bicycle-types section", async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop navigation is checked in the desktop browser project.");
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Bike types" }).click();
  await expect(page).toHaveURL(/#bike-types$/);
  await expect(page.getByRole("heading", { name: /five kinds of bikes/i })).toBeVisible();
});

test("bicycle explorer synchronizes component selection and supports variant changes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose Mountain bike" }).click();
  await page.getByRole("button", { name: "Select Rear wheel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rear wheel" })).toBeVisible();
  await expect(page.locator("#mountain-rear-wheel")).toHaveAttribute("aria-pressed", "true");

  // A shared component remains selected when moving to another compatible bike type.
  await page.getByRole("button", { name: "Choose Road bike" }).click();
  await expect(page.getByRole("heading", { name: "Rear wheel" })).toBeVisible();
  await expect(page.locator("#road-rear-wheel")).toHaveAttribute("aria-pressed", "true");

  // An incompatible electric component is reset when the user picks a non-electric type.
  await page.getByRole("button", { name: "Choose E-bike" }).click();
  await page.getByRole("button", { name: "Select Battery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Battery" })).toBeVisible();
  await page.getByRole("button", { name: "Choose Road bike" }).click();
  await expect(page.getByRole("heading", { name: "Front brake" })).toBeVisible();
  await expect(page.locator("#road-front-brake")).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Choose I'm not sure" }).click();
  await expect(page.getByRole("heading", { name: "Mountain bike example" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose I'm not sure" })).toHaveAttribute("aria-pressed", "true");
});
