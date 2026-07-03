import { test, expect } from '@playwright/test'

// Markers render as Leaflet divIcons: a .leaflet-marker-icon div whose
// innerHTML contains an <img> with the icon URL. Tiles are served from
// /palres/tiles/<MapId>/<MapId>_XX_YY.webp by the Vite dev middleware.

test('renders MainWorld tiles', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(
    page.locator('img.leaflet-tile[src*="/palres/tiles/MainWorld/"]').first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('fast-travel markers are present', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
  // divIcon markers: .leaflet-marker-icon wrapping an <img src="...T_icon_compass_FTtower.webp">
  await expect(
    page
      .locator('.leaflet-marker-pane .leaflet-marker-icon img[src*="T_icon_compass_FTtower"]')
      .first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('toggling a subtype hides its markers', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
  const ftMarkers = page.locator(
    '.leaflet-marker-pane .leaflet-marker-icon img[src*="T_icon_compass_FTtower"]',
  )
  await expect(ftMarkers.first()).toBeVisible({ timeout: 15_000 })
  // The testid is on the <input type="checkbox"> directly — uncheck works.
  await page.getByTestId('subtype-toggle-fastTravel').uncheck()
  await expect(ftMarkers).toHaveCount(0, { timeout: 10_000 })
})

test('switching language to ko-KR localizes UI and data labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await page.getByLabel('language').selectOption('ko-KR')
  // App UI string (i18n resources) + data-locale taxonomy label (types.json).
  await expect(page.getByRole('heading', { name: '팰월드 지도' })).toBeVisible()
  await expect(page.getByText('팰 출현 지점').first()).toBeVisible({ timeout: 10_000 })
})

test('map switch swaps tile URLs', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(
    page.locator('img.leaflet-tile[src*="/palres/tiles/MainWorld/"]').first(),
  ).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('map-tab-WorldTree').click()
  await expect(
    page.locator('img.leaflet-tile[src*="/palres/tiles/WorldTree/"]').first(),
  ).toBeVisible({ timeout: 15_000 })
})
