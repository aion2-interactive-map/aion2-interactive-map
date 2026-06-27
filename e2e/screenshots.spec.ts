import { test } from "@playwright/test";

const MAPS = ["World_L_A", "Abyss_Reshanta_A"];
const THEMES = ["light", "dark", "abyss"] as const;
const LANGS = ["en", "zh-CN"] as const;

for (const map of MAPS) {
  for (const theme of THEMES) {
    for (const lng of LANGS) {
      test(`shot ${map} ${theme} ${lng}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("aion2.theme", t), theme);
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(`/?map=${map}&lng=${lng}`);
        await page.locator(".leaflet-container").waitFor({ state: "visible", timeout: 20_000 });
        await page.locator(".leaflet-tile-loaded").first().waitFor({ timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(2500); // let tiles + markers settle
        await page.screenshot({ path: `.screenshots/${map}-${theme}-${lng}.png`, fullPage: false });
      });
    }
  }
}
