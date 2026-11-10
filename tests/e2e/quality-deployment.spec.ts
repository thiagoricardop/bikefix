import { expect, test } from "@playwright/test";

const publicAndAppRoutes = [
  "/",
  "/diagnose",
  "/guides",
  "/guides/flat-tire-inner-tube",
  "/guides/content-inventory",
  "/request-repair-guide",
  "/privacy",
];

test.describe("Phase 09 quality and release safeguards", () => {
  test("critical routes expose one main landmark and one page heading", async ({ page }) => {
    for (const route of publicAndAppRoutes) {
      await page.goto(route);
      await expect(page.locator("main#main-content")).toHaveCount(1, { timeout: 10_000 });
      await expect(page.locator("h1")).toHaveCount(1, { timeout: 10_000 });
      await expect(page).toHaveTitle(/BikeFix/);
    }
  });

  test("draft and operational pages are not advertised for indexing", async ({ page }) => {
    for (const route of ["/diagnose", "/guides", "/guides/flat-tire-inner-tube", "/guides/content-inventory", "/request-repair-guide"]) {
      await page.goto(route);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
    await page.goto("/privacy");
    const privacyRobots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(privacyRobots ?? "").not.toContain("noindex");
  });

  test("security headers are present and private pages receive a nonce CSP", async ({ page }) => {
    const home = await page.goto("/");
    expect(home).not.toBeNull();
    const homeHeaders = await home!.allHeaders();
    expect(homeHeaders["x-content-type-options"]).toBe("nosniff");
    expect(homeHeaders["x-frame-options"]).toBe("DENY");
    expect(homeHeaders["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(homeHeaders["content-security-policy"]).toContain("script-src-attr 'none'");

    const requestPage = await page.goto("/request-repair-guide");
    const requestHeaders = await requestPage!.allHeaders();
    expect(requestHeaders["cache-control"]).toContain("no-store");
    expect(requestHeaders["content-security-policy"]).toMatch(/script-src[^;]*'nonce-[^']+'/);
    expect(requestHeaders["content-security-policy"]).not.toContain("'unsafe-inline'");
  });

  test("robots and sitemap do not expose draft guides or operational routes", async ({ request }) => {
    const robotsResponse = await request.get("/robots.txt");
    expect(robotsResponse.ok()).toBeTruthy();
    const robotsText = await robotsResponse.text();
    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.ok()).toBeTruthy();
    const sitemapText = await sitemapResponse.text();

    if (!robotsText.includes("Sitemap:")) {
      expect(robotsText).toContain("Disallow: /");
      expect(sitemapText).not.toContain("<loc>");
    } else {
      expect(robotsText).toContain("Disallow: /api/");
      expect(sitemapText).toContain("<loc>");
      expect(sitemapText).not.toContain("/request-repair-guide");
      expect(sitemapText).not.toContain("/diagnose");
      expect(sitemapText).not.toContain("/content-inventory");
      // The current catalog contains only draft guides, so none is indexable yet.
      expect(sitemapText).not.toContain("/guides/");
    }
  });

  test("skip navigation is the first keyboard stop and reaches the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => ({
      className: (document.activeElement as HTMLElement | null)?.className,
      text: document.activeElement?.textContent?.trim(),
    }));
    expect(firstFocus.className).toContain("skip-link");
    expect(firstFocus.text).toContain("Skip to content");
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("form fields have programmatic labels and the layout has no horizontal overflow", async ({ page }, testInfo) => {
    await page.setViewportSize(testInfo.project.name.includes("mobile") ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.goto("/request-repair-guide");
    const unlabeledControls = await page.locator("input:not([type=hidden]), textarea, select").evaluateAll((nodes) => nodes.filter((node) => {
      const control = node as HTMLInputElement;
      return !control.labels?.length && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby");
    }).length);
    expect(unlabeledControls).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test("reduced-motion preference removes smooth document scrolling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    expect(scrollBehavior).toBe("auto");
  });
});
