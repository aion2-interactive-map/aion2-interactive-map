import { test, expect } from "@playwright/test";

// Regression: moving the cursor must NOT repaint the whole region SVG overlay
// (root cause of the marker/tooltip "blink"). We assert the overlay pane sees
// only minimal mutations during a mousemove burst that doesn't cross regions.
test("cursor movement does not churn the region overlay (no flicker)", async ({
  page,
}) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 20_000 });

  // Labels on (permanent tooltips present) to mirror the reported scenario.
  await page.getByRole("switch").first().click();
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const ov = document.querySelector(".leaflet-overlay-pane");
    const w = window as Window & typeof globalThis & { __ov?: number };
    w.__ov = 0;
    if (ov) {
      new MutationObserver((muts) => {
        for (const m of muts)
          w.__ov! +=
            m.addedNodes.length +
            m.removedNodes.length +
            (m.type === "attributes" ? 1 : 0);
      }).observe(ov, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "d", "class", "points"],
      });
    }
  });

  // Small mousemove burst within a tight area (minimise region crossings).
  const box = (await page.locator(".leaflet-container").boundingBox())!;
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.5;
  for (let i = 0; i < 30; i++) {
    await page.mouse.move(cx + (i % 6), cy + ((i + 3) % 6));
    await page.waitForTimeout(15);
  }

  const overlayMutations = await page.evaluate(
    () => (window as Window & typeof globalThis & { __ov?: number }).__ov ?? 0,
  );
  console.log(`overlayMutationsDuringMousemove=${overlayMutations}`);
  // Before fix this was ~1110 (all ~37 polygons restyled every move). After
  // isolating cursor state + memoizing polygons it should be near zero.
  expect(overlayMutations).toBeLessThan(20);
});
