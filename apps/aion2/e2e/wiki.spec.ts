import { expect, test } from "@playwright/test";

test.describe("wiki", () => {
  test("home TOC renders groups", async ({ page }) => {
    await page.goto("/wiki?lng=en");
    await expect(page.getByTestId("wiki-home")).toBeVisible();
    await expect(page.getByTestId("wiki-group-main")).toBeVisible();
  });

  test("group list renders sections and navigates to quest page", async ({
    page,
  }) => {
    await page.goto("/wiki/quest/main?lng=en");
    await expect(page.getByTestId("wiki-group-list")).toBeVisible();
    await page.getByTestId("wiki-entry-1101010").click();
    await expect(page.getByTestId("wiki-quest-page")).toBeVisible();
    await expect(page.getByTestId("quest-rewards")).toBeVisible();
  });

  test("quest page embedded map shows only POI pins", async ({ page }) => {
    await page.goto("/wiki/quest/main?lng=en");
    await page.locator('[data-testid^="wiki-entry-"]').first().click();
    const embed = page.getByTestId("embedded-map");
    if (await embed.isVisible()) {
      const pins = embed.locator(".leaflet-marker-icon");
      expect(await pins.count()).toBeGreaterThan(0);
      expect(await pins.count()).toBeLessThan(60);
    }
  });

  test("hub search finds quests", async ({ page }) => {
    await page.goto("/wiki/quest?lng=en");
    await page.getByTestId("wiki-search").fill("a");
    await expect(page.getByTestId("wiki-search-results")).toBeVisible();
  });

  test("hub faction split", async ({ page }) => {
    await page.goto("/wiki/quest?lng=en");
    const mainGroup = page.getByTestId("wiki-hub-group-main");
    await expect(mainGroup.getByTestId("faction-col-light")).toBeVisible();
    await expect(mainGroup.getByTestId("faction-col-dark")).toBeVisible();
  });

  test("faction deep link", async ({ page }) => {
    await page.goto("/wiki/quest/main?faction=dark&lng=en");
    await expect(page.getByTestId("faction-dark")).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  test("map deep-link ?pos= flies without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/?map=World_L_A&pos=4000,4000&lng=en");
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});
