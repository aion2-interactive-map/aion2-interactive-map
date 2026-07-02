// @vitest-environment jsdom
// (leaflet touches `window` at import time, so this file needs a DOM)
import { describe, expect, it } from "vitest";
import {
  dataToLatLng,
  dataToLatLngTuple,
  latLngToData,
  mapHeightOf,
} from "./coords.ts";
import type { GameMapMeta } from "@gamemap/data-contract";

const map: GameMapMeta = {
  id: "World_L_A",
  name: "World_L_A",
  type: "light",
  tileWidth: 256,
  tileHeight: 256,
  tilesCountX: 32,
  tilesCountY: 32,
  isVisible: true,
};

describe("coords", () => {
  it("mapHeightOf = tileHeight * tilesCountY", () => {
    expect(mapHeightOf(map)).toBe(8192);
  });

  it("applies exactly one vertical flip (y=0 → lat=height)", () => {
    const ll = dataToLatLng(map, 100, 0);
    expect(ll.lat).toBe(8192);
    expect(ll.lng).toBe(100);
  });

  it("latLngToData ∘ dataToLatLng = identity", () => {
    for (const [x, y] of [
      [0, 0],
      [4096, 4096],
      [8191.5, 123.25],
    ]) {
      const ll = dataToLatLng(map, x, y);
      const back = latLngToData(map, ll.lat, ll.lng);
      expect(back.x).toBeCloseTo(x, 10);
      expect(back.y).toBeCloseTo(y, 10);
    }
  });

  it("tuple form matches LatLng form", () => {
    const [lat, lng] = dataToLatLngTuple(map, 42, 77);
    const ll = dataToLatLng(map, 42, 77);
    expect(lat).toBe(ll.lat);
    expect(lng).toBe(ll.lng);
  });
});
