// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createPinIcon } from "./markerIcons.tsx";

const html = (icon: L.DivIcon) => String(icon.options.html ?? "");

describe("createPinIcon count badge", () => {
  it("renders a count badge when count > 1", () => {
    const icon = createPinIcon("/icon.webp", 1.25, false, { count: 12 });
    expect(html(icon)).toContain(">12<");
  });

  it("omits the badge for count of 1 or absent", () => {
    expect(html(createPinIcon("/a.webp", 1.25, false, { count: 1 }))).not.toContain(">1<");
    expect(html(createPinIcon("/b.webp", 1.25, false, {}))).not.toMatch(/>\d+</);
  });

  it("keys the icon cache on count (distinct counts → distinct icons)", () => {
    const a = createPinIcon("/same.webp", 1.25, false, { count: 3 });
    const b = createPinIcon("/same.webp", 1.25, false, { count: 9 });
    expect(a).not.toBe(b);
    expect(html(a)).toContain(">3<");
    expect(html(b)).toContain(">9<");
  });
});
