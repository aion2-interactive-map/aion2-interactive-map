// @vitest-environment jsdom
// (leaflet touches `window` at import time, so this file needs a DOM)
import { describe, expect, it } from "vitest";
import {
  dataToLatLng,
  dataToLatLngTuple,
  latLngToData,
  mapHeightOf,
  worldToPixel,
  pixelToWorld,
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

// Palworld MainWorld: 8192×8192 grid, world→pixel via pxAxis=Y, flipY.
const worldMap: GameMapMeta = {
  id: "MainWorld",
  name: "MainWorld",
  type: "world",
  tileWidth: 1024,
  tileHeight: 1024,
  tilesCountX: 8,
  tilesCountY: 8,
  isVisible: true,
  worldBounds: { min: { x: -1099400, y: -724400 }, max: { x: 349400, y: 724400 } },
  orientation: { pxAxis: "Y", flipX: false, flipY: true },
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

describe("worldToPixel / pixelToWorld", () => {
  it("is identity when the map has no worldBounds (legacy pixel data)", () => {
    expect(worldToPixel(map, 100, 200)).toEqual({ x: 100, y: 200 });
    expect(pixelToWorld(map, 100, 200)).toEqual({ x: 100, y: 200 });
  });

  it("maps MainWorld world coords to pixels (pxAxis=Y, flipY)", () => {
    // Center of world bounds → center pixel.
    expect(worldToPixel(worldMap, -375000, 0)).toMatchObject({ x: 4096, y: 4096 });
    // (minX,minY) → bottom-left pixel (flipY sends min world-X to py=height).
    expect(worldToPixel(worldMap, -1099400, -724400)).toMatchObject({ x: 0, y: 8192 });
    // (maxX,maxY) → top-right pixel.
    expect(worldToPixel(worldMap, 349400, 724400)).toMatchObject({ x: 8192, y: 0 });
  });

  it("pixelToWorld ∘ worldToPixel = identity", () => {
    for (const [x, y] of [
      [-375000, 0],
      [12345.6, -98765.4],
      [200000, 500000],
    ]) {
      const p = worldToPixel(worldMap, x, y);
      const back = pixelToWorld(worldMap, p.x, p.y);
      expect(back.x).toBeCloseTo(x, 4);
      expect(back.y).toBeCloseTo(y, 4);
    }
  });
});

describe("dataToLatLng on a world map", () => {
  it("composes world→pixel then the single vertical flip", () => {
    // world center → pixel(4096,4096) → lat = 8192-4096, lng = 4096
    const ll = dataToLatLng(worldMap, -375000, 0);
    expect(ll.lat).toBeCloseTo(4096, 6);
    expect(ll.lng).toBeCloseTo(4096, 6);
  });

  it("latLngToData ∘ dataToLatLng = identity (world coords in/out)", () => {
    for (const [x, y] of [
      [-375000, 0],
      [200000, 500000],
      [-900000, -300000],
    ]) {
      const ll = dataToLatLng(worldMap, x, y);
      const back = latLngToData(worldMap, ll.lat, ll.lng);
      expect(back.x).toBeCloseTo(x, 3);
      expect(back.y).toBeCloseTo(y, 3);
    }
  });
});
