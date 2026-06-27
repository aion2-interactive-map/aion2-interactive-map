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
