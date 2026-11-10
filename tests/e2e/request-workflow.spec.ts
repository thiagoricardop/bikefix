import { expect, test } from "@playwright/test";

const fakeReference = "d9428888-122b-4f04-9d32-0a40e6b77223";

test.describe("request a repair guide", () => {
  test("is reachable from product entry points and privacy copy is available", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /suggest a repair/i }).first().click();
    await expect(page).toHaveURL(/\/request-repair-guide$/);
    await expect(page.getByRole("heading", { name: /what would help you/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /privacy notice/i })).toBeVisible();
    await page.getByRole("link", { name: /privacy notice/i }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { name: /out of the public library/i })).toBeVisible();
  });

  test("shows all form fields and is usable without horizontal overflow on desktop and mobile", async ({ page }) => {
    await page.goto("/request-repair-guide");
    await expect(page.getByRole("textbox", { name: /what guide would help/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /describe the problem/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /bicycle type/i }).locator("option")).toHaveCount(6);
    await expect(page.getByRole("checkbox", { name: /i'd like a reply/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  });

  test("cannot claim recorded success when production configuration is missing", async ({ page, request }) => {
    await page.goto("/request-repair-guide");
    const submit = page.getByRole("button", { name: /send guide request/i });
    if (await submit.isDisabled()) {
      await expect(page.getByRole("status")).toContainText(/submissions are not enabled/i);
      const response = await request.post("/api/repair-requests", {
        data: {
          summary: "Help identify chain wear",
          description: "A beginner needs help understanding what chain wear may look like and what to inspect.",
          bicycleType: "road",
          email: "",
          wantsReply: false,
          idempotencyKey: fakeReference,
        },
      });
      expect(response.status()).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false, code: "submissions_disabled" });
    } else {
      test.skip(true, "This deployment has configured its request workflow; do not make real submissions in this E2E test.");
    }
  });

  test("shows a truthful recorded state with a reference and provider-acceptance wording", async ({ page }) => {
    await page.goto("/request-repair-guide");
    const submit = page.getByRole("button", { name: /send guide request/i });
    if (await submit.isDisabled()) test.skip(true, "The workflow is intentionally disabled in an unconfigured production build.");
    await page.route("**/api/repair-requests", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, requestId: fakeReference, status: "recorded", notificationStatus: "accepted", message: "Your request has been saved. The email provider accepted the developer notification; this does not confirm delivery." }),
    }));
    await page.getByRole("textbox", { name: /what guide would help/i }).fill("Help identify a worn chain");
    await page.getByRole("textbox", { name: /describe the problem/i }).fill("A beginner guide to recognizing chain wear and what to inspect safely.");
    await page.getByRole("button", { name: /send guide request/i }).click();
    await expect(page.getByRole("heading", { name: /thanks for helping shape bikefix/i })).toBeVisible();
    await expect(page.getByText(fakeReference)).toBeVisible();
    await expect(page.getByText(/does not confirm delivery/i)).toBeVisible();
  });
});
