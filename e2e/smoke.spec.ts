import { test, expect } from "@playwright/test";

test("app boots without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await expect(page.getByTestId("boot-check")).toBeVisible();
  expect(errors, errors.join("\n")).toHaveLength(0);
});
