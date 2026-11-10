import { expect, test } from "@playwright/test";

test("guided front-brake flow branches, returns to a previous answer, and can restart", async ({ page }) => {
  await page.goto("/diagnose?symptom=front-brake-rubs&bicycleType=road");
  await expect(page.getByRole("heading", { name: "Does the front brake still stop the wheel reliably?" })).toBeVisible();

  await page.getByRole("button", { name: "Yes, braking feels normal" }).click();
  await expect(page.getByRole("heading", { name: "Where does the rubbing appear to come from?" })).toBeVisible();
  await page.getByRole("button", { name: "Near a disc rotor" }).click();
  await expect(page.getByRole("heading", { name: "What your answers suggest" })).toBeVisible();
  await expect(page.getByText(/No reviewed guide is available for this scenario yet/i)).toBeVisible();

  await page.getByRole("button", { name: /Review previous answer/i }).click();
  await expect(page.getByRole("heading", { name: "Where does the rubbing appear to come from?" })).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: "Does the front brake still stop the wheel reliably?" })).toBeVisible();
});

test("visible structural damage stops the flow immediately", async ({ page }) => {
  await page.goto("/diagnose?symptom=visible-frame-damage&bicycleType=mountain");
  await expect(page.getByRole("heading", { name: "Stop riding and seek a qualified inspection" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Answer options" })).toHaveCount(0);
  await expect(page.getByText(/Do not continue this troubleshooting flow as a repair procedure/i)).toBeVisible();
});

test("the symptom reference starts the wizard with the selected symptom and bicycle type", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose Mountain bike" }).click();
  await page.getByLabel("Search parts or symptoms").fill("puncture");
  await page.getByRole("button", { name: "Explore symptom Flat tire" }).click();
  await page.getByRole("link", { name: /Start guided symptom check/i }).click();
  await expect(page).toHaveURL(/\/diagnose\?symptom=flat-tire&bicycleType=mountain/);
  await expect(page.getByRole("heading", { name: "What best describes the tire right now?" })).toBeVisible();
});

test("e-bike electrical checks require compatible bicycle selection", async ({ page }) => {
  await page.goto("/diagnose?symptom=ebike-assist-unavailable&bicycleType=road");
  await expect(page.getByRole("heading", { name: "This flow does not match the selected bicycle" })).toBeVisible();
  await page.getByLabel("Which bicycle do you have?").selectOption("ebike");
  await expect(page.getByRole("heading", { name: /Is the battery swollen/i })).toBeVisible();
  await page.getByRole("button", { name: "Yes, one of these signs is present" }).click();
  await expect(page.getByRole("heading", { name: "Stop here before riding or charging" })).toBeVisible();
});
