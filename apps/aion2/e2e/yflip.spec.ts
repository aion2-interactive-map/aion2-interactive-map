import { test, expect } from "@playwright/test";

/**
 * Regression for the vertical (Y) flip between DATA/image space (y DOWN, used by
 * markers/regions and the tiles) and Leaflet CRS.Simple (lat UP).
 *
 * Data (x, y) must map to Leaflet via `lat = mapHeight - y`, `lng = x`, so that
 * markers/regions sit on the same tiles. We project known DATA points through
 * the REAL map instance (published on window in dev) and assert:
 *  - a max-Y data point (bottom of the image) lands in the BOTTOM half, and
 *  - a min-Y data point (top of the image) lands in the TOP half,
 * where Leaflet layer-point Y increases DOWNWARD on screen.
 */
test("markers are projected with the image->Leaflet vertical flip", async ({
  page,
}) => {
  await page.goto("/?map=World_L_A&lng=en");
  await page.locator(".leaflet-container").waitFor({ state: "visible" });
  await page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 15_000 });

  const result = await page.evaluate(() => {
    type LeafletMapLike = {
      project: (latlng: [number, number], zoom: number) => { x: number; y: number };
      getMaxZoom: () => number;
    };
    const map = (window as unknown as { __leafletMap?: LeafletMapLike })
      .__leafletMap;
    if (!map) return null;

    // World_L_A is an 8192x8192 grid (tileHeight 1024 x tilesCountY 8).
    const mapHeight = 8192;
    const z = map.getMaxZoom();

    // DATA points (image space). Top-of-image (small y) and bottom (large y).
    const topData = { x: 1813, y: 1257 }; // min-Y marker
    const bottomData = { x: 5071, y: 6309 }; // max-Y marker

    const dataToLatLng = (x: number, y: number): [number, number] => [
      mapHeight - y,
      x,
    ];

    const topPt = map.project(dataToLatLng(topData.x, topData.y), z);
    const bottomPt = map.project(dataToLatLng(bottomData.x, bottomData.y), z);
    const fullH = map.project([mapHeight, 0], z).y; // layer Y at lat=mapHeight (top)
    const fullBottom = map.project([0, 0], z).y; // layer Y at lat=0 (bottom)

    return { topY: topPt.y, bottomY: bottomPt.y, fullH, fullBottom, mapHeight };
  });

  expect(result, "Leaflet map handle not exposed on window").not.toBeNull();
  const r = result!;

  // Layer-point Y increases downward. After the flip, the bottom-of-image data
  // point must have a LARGER layer Y than the top-of-image one.
  expect(r.bottomY).toBeGreaterThan(r.topY);

  // The top-of-image point sits in the upper half, the bottom in the lower half
  // of the [fullH(top) .. fullBottom(bottom)] pixel span.
  const span = r.fullBottom - r.fullH;
  const mid = r.fullH + span / 2;
  expect(r.topY).toBeLessThan(mid);
  expect(r.bottomY).toBeGreaterThan(mid);
});
