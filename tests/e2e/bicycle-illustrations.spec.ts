import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const TYPES = [
  { id: "road", name: "Road bike" },
  { id: "mountain", name: "Mountain bike" },
  { id: "hybrid", name: "Hybrid / commuter" },
  { id: "gravel", name: "Gravel bike" },
  { id: "ebike", name: "E-bike" },
] as const;

type Anchor = { regionId: string; componentId: string; name: string; x: number; y: number };

/** Converts each part's SVG anchor to viewport coordinates using the rendered SVG transform. */
async function partAnchors(svg: Locator): Promise<Anchor[]> {
  return svg.evaluate((el) => {
    const root = el as SVGSVGElement;
    const ctm = root.getScreenCTM();
    if (!ctm) throw new Error("SVG has no screen transform");
    return [...root.querySelectorAll<SVGGElement>(".bike-part")].map((part) => {
      const point = new DOMPoint(Number(part.dataset.anchorX), Number(part.dataset.anchorY)).matrixTransform(ctm);
      return { regionId: part.id, componentId: part.dataset.componentId ?? "", name: part.getAttribute("aria-label") ?? "", x: point.x, y: point.y };
    });
  });
}

async function chooseType(page: Page, name: string, id: string) {
  await page.getByRole("button", { name: `Choose ${name}` }).click();
  const svg = page.locator(`svg.interactive-bike-svg[data-bike-type="${id}"]`);
  await expect(svg).toBeVisible();
  await svg.scrollIntoViewIfNeeded();
  return svg;
}

for (const type of TYPES) {
  test(`${type.name}: every visible part resolves to its own region and selects by pointer`, async ({ page }) => {
    await page.goto("/");
    const svg = await chooseType(page, type.name, type.id);
    const anchors = await partAnchors(svg);
    expect(anchors.length).toBeGreaterThanOrEqual(16);

    for (const anchor of anchors) {
      const topmost = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".bike-part")?.id ?? null, anchor);
      expect(topmost, `${anchor.regionId} anchor is covered by another region`).toBe(anchor.regionId);
    }

    for (const anchor of anchors) {
      await page.mouse.click(anchor.x, anchor.y);
      await expect(page.locator(`#${anchor.regionId}`), anchor.regionId).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#selected-part-title")).toHaveText(anchor.name);
      await expect(page.getByRole("button", { name: `Select ${anchor.name}`, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("selected-part-marker")).toHaveAttribute("data-marker-for", anchor.componentId);
    }
  });
}

test("SVG parts are reachable by Tab with a visible focus indicator and select with Enter or Space", async ({ page }) => {
  await page.goto("/");
  await chooseType(page, "Mountain bike", "mountain");
  await page.getByRole("button", { name: "Choose I'm not sure" }).focus();

  let focusedId = "";
  for (let i = 0; i < 12 && focusedId !== "mountain-rear-suspension"; i += 1) {
    await page.keyboard.press("Tab");
    focusedId = await page.evaluate(() => document.activeElement?.id ?? "");
  }
  expect(focusedId).toBe("mountain-rear-suspension");
  const shock = page.locator("#mountain-rear-suspension");
  const ring = await shock.locator(".part-focus-ring").evaluate((el) => getComputedStyle(el).strokeWidth);
  expect(Number.parseFloat(ring)).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(page.locator("#selected-part-title")).toHaveText("Rear suspension");
  await expect(shock).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Tab");
  const next = page.locator(":focus");
  await expect(next).toHaveClass(/bike-part/);
  await page.keyboard.press(" ");
  await expect(next).toHaveAttribute("aria-pressed", "true");
  await expect(shock).toHaveAttribute("aria-pressed", "false");
});

test("captures the five bicycle explorer views for visual review", async ({ page }, testInfo: TestInfo) => {
  await page.goto("/");
  const viewportWidth = page.viewportSize()?.width ?? 0;
  for (const type of TYPES) {
    const svg = await chooseType(page, type.name, type.id);
    const box = await svg.boundingBox();
    expect(box, type.id).not.toBeNull();
    expect(box!.width).toBeGreaterThan(Math.min(320, viewportWidth - 48));
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 0.5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${type.id} horizontal overflow`).toBeLessThanOrEqual(0);

    const overlaps = await svg.evaluate((el) => {
      const art = el.querySelector(".bike-art")!.getBoundingClientRect();
      return [...el.parentElement!.querySelectorAll(".canvas-label")]
        .map((label) => ({ text: label.textContent ?? "", r: label.getBoundingClientRect() }))
        .filter(({ r }) => r.left < art.right && r.right > art.left && r.top < art.bottom && r.bottom > art.top)
        .map(({ text }) => text);
    });
    expect(overlaps, `${type.id}: canvas labels covering the drawing`).toEqual([]);

    const file = testInfo.outputPath(`${testInfo.project.name}-${type.id}.png`);
    await page.locator(".explorer-workspace").screenshot({ path: file });
    await testInfo.attach(`${testInfo.project.name}-${type.id}`, { path: file, contentType: "image/png" });
  }
});
