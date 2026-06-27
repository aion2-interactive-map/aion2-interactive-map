import { test, expect } from "@playwright/test";

test("map renders tiles and markers from local data, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/?map=World_L_A");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({ timeout: 15_000 });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("type filter toggles marker visibility", async ({ page }) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 15_000 });
  const before = await page.locator(".leaflet-marker-icon").count();
  await page.getByTestId("subtype-toggle-monolithMaterial").click();
  await expect
    .poll(() => page.locator(".leaflet-marker-icon").count(), { timeout: 10_000 })
    .not.toBe(before);
});

test("search returns hits", async ({ page }) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page.getByTestId("marker-search").fill("a");
  await expect(
    page.getByTestId("search-results").locator("li, button").first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("clicking a marker opens a local popup", async ({ page }) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 15_000 });
  // Markers are scattered across the map; many sit outside the initial
  // viewport or behind the sidebar. Click the first icon that is fully
  // within the map container and clear of the (overlaying) sidebar.
  const icons = page.locator(".leaflet-marker-icon");
  const count = await icons.count();
  const viewport = page.viewportSize();
  const sidebarBox = await page.locator("aside").first().boundingBox();
  const minX = sidebarBox ? sidebarBox.x + sidebarBox.width : 0;
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const box = await icons.nth(i).boundingBox();
    if (
      box &&
      viewport &&
      box.x >= minX &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height
    ) {
      await icons.nth(i).click({ timeout: 15_000 });
      clicked = true;
      break;
    }
  }
  expect(clicked, "no clickable in-viewport marker found").toBe(true);
  await expect(page.locator(".leaflet-popup")).toBeVisible();
  await expect(page.getByTestId("marker-popup-card")).toBeVisible();
});

test("theme switch applies the theme class", async ({ page }) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page.getByTestId("theme-menu").click();
  await page.getByTestId("theme-dark").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("language switch changes labels", async ({ page }) => {
  await page.goto("/?map=World_L_A&lng=en");
  const sel = page.getByTestId("map-select");
  const enText = (await sel.textContent())?.trim() ?? "";
  await page.getByTestId("lang-menu").click();
  await page.getByTestId("lang-zh-CN").click();
  await expect(sel).not.toHaveText(enText, { timeout: 10_000 });
});
