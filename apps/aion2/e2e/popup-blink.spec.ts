import { test, expect, type Page } from "@playwright/test";

async function clickInViewportMarker(page: Page) {
  const icons = page.locator(".leaflet-marker-icon");
  const count = await icons.count();
  const viewport = page.viewportSize();
  const sidebarBox = await page.locator("aside").first().boundingBox();
  const minX = sidebarBox ? sidebarBox.x + sidebarBox.width : 0;

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
      try {
        await icons.nth(i).click({ timeout: 3_000 });
        return;
      } catch {
        continue;
      }
    }
  }
  throw new Error("no clickable in-viewport marker found");
}

// Regression: dragging the map must NOT remove + re-add the open marker popup.
// The standalone <Popup> receives a freshly-allocated [lat,lng] array every
// render; react-leaflet's popup lifecycle effect lists `position` in its deps,
// so a new reference tears the popup layer down (map.removeLayer) and re-opens
// it (openOn), replaying Leaflet's open fade-in — the visible "blink". A drag
// ends with one `moveend`, which re-renders the map and triggers exactly that.
//
// We open a popup, let everything settle, then observe the popup pane's
// childList while dragging. A blink = the popup node removed then re-added
// (>= 2 child mutations). With a stable `position` it should be zero.
test("dragging the map does not blink the open marker popup", async ({
  page,
}) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page
    .locator(".leaflet-marker-icon")
    .first()
    .waitFor({ timeout: 20_000 });

  // Open the marker popup by clicking a marker, then let the focus flyTo and
  // the popup autoPan fully settle so they don't pollute the observation.
  await clickInViewportMarker(page);
  await page.locator(".leaflet-popup").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1500);

  // Count add/remove of popup nodes within the popup pane.
  await page.evaluate(() => {
    const pane = document.querySelector(".leaflet-popup-pane");
    const w = window as Window & typeof globalThis & { __pp?: number };
    w.__pp = 0;
    if (pane) {
      new MutationObserver((muts) => {
        for (const m of muts)
          w.__pp! += m.addedNodes.length + m.removedNodes.length;
      }).observe(pane, { childList: true, subtree: true });
    }
  });

  // Drag the map from a likely-empty corner (zoom -3 fits the whole map, so the
  // corner is background) so we pan instead of selecting another marker.
  const box = (await page.locator(".leaflet-container").boundingBox())!;
  const sx = box.x + box.width * 0.15;
  const sy = box.y + box.height * 0.15;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(sx + i * 25, sy + i * 18);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(700); // let moveend + any re-render settle

  // The popup must still be open after the drag.
  await expect(page.locator(".leaflet-popup")).toBeVisible();

  const popupMutations = await page.evaluate(
    () => (window as Window & typeof globalThis & { __pp?: number }).__pp ?? 0,
  );
  console.log(`popupPaneMutationsDuringDrag=${popupMutations}`);
  // Before fix: popup removed (1) + re-added (1) = >= 2 per drag (the blink).
  // After fix (stable position): 0.
  expect(popupMutations).toBeLessThan(2);
});
