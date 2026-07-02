// AION2 implementation of the engine `MapAssets` contract, built on the app's
// URL helpers (`lib/url`). Module-level singleton: the object reference is
// stable so it can be passed straight into memoized engine components.
import type { GameMapMeta } from "@gamemap/data-contract";
import type { MapAssets } from "@gamemap/map-engine";
import { getStaticUrl, parseIconUrl } from "@/lib/url";

export const aionAssets: MapAssets = {
  // Tiles are named "<Map>_XX_YY.webp" with 2-digit zero padding, under the
  // resource repo's UI/Map/WorldMap/<Map>/Res/ folder.
  tileUrl(map: GameMapMeta, x: number, y: number): string {
    const xStr = String(x).padStart(2, "0");
    const yStr = String(y).padStart(2, "0");
    return getStaticUrl(
      `UI/Map/WorldMap/${map.name}/Res/${map.name}_${xStr}_${yStr}.webp`,
    );
  },
  // parseIconUrl supplies the hidden-marker fallback icon for empty paths and
  // swaps Light→Dark icon variants on dark (Asmodian) maps.
  markerIconUrl(icon: string | undefined, map: GameMapMeta): string {
    return parseIconUrl(icon ?? "", map);
  },
  watermarkUrl: getStaticUrl("images/watermark.webp"),
};
