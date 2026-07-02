// Round-trips small real excerpts of the AION2 data repo (see test/fixtures/)
// through the contract schemas. The fixtures deliberately keep the extra
// fields real files carry (`order` on maps/categories, `z` on markers) to
// pin down that the schemas are non-strict.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mapsFileSchema,
  rawMarkersFileSchema,
  rawRegionsFileSchema,
  typesFileSchema,
} from "./schemas.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../test/fixtures");
const load = (f: string): unknown =>
  JSON.parse(readFileSync(join(fixtures, f), "utf8"));

describe("data-contract schemas", () => {
  it("accepts valid fixture files", () => {
    expect(mapsFileSchema.safeParse(load("maps.json")).success).toBe(true);
    expect(typesFileSchema.safeParse(load("types.json")).success).toBe(true);
    expect(rawMarkersFileSchema.safeParse(load("markers.json")).success).toBe(true);
    expect(rawRegionsFileSchema.safeParse(load("regions.json")).success).toBe(true);
  });

  it("rejects a marker missing coordinates", () => {
    const bad = load("markers.json") as { markers: Record<string, unknown>[] };
    delete bad.markers[0].x;
    expect(rawMarkersFileSchema.safeParse(bad).success).toBe(false);
  });
});
