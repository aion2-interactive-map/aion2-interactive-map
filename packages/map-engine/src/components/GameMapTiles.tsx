import React, { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";
import type { MapAssets } from "../engineTypes.ts";

type GameTilesProps = {
  selectedMap: GameMapMeta;
  assets: MapAssets;
};

type GameTileLayerOptions = L.TileLayerOptions &
  GameTilesProps & {
    isWatermark?: boolean;
  };

class GameTileLayer extends L.TileLayer {
  private readonly gameOptions: GameTileLayerOptions;

  constructor(options: GameTileLayerOptions) {
    options.tileSize = options.selectedMap.tileWidth;
    super("", options);
    this.gameOptions = options;
  }

  getTileUrl(coords: L.Coords): string {
    const { selectedMap, assets, isWatermark } = this.gameOptions;

    // Leaflet coords.x, coords.y are tile indices; the vertical index is
    // converted to the game's tile grid before URL resolution.
    const x = coords.x;
    const y = selectedMap.tilesCountY + coords.y;

    // Reject out-of-grid indices (noWrap): empty URL, no tile requested.
    if (
      x < 0 ||
      y < 0 ||
      x >= selectedMap.tilesCountX ||
      y >= selectedMap.tilesCountY
    ) {
      return "";
    }

    if (isWatermark) {
      return assets.watermarkUrl ?? "";
    }

    // The engine owns grid math; the app owns URL construction.
    return assets.tileUrl(selectedMap, x, y);
  }
}

const GameMapTiles: React.FC<GameTilesProps> = ({ selectedMap, assets }) => {
  const map = useMap();

  useEffect(() => {
    const layer = new GameTileLayer({
      selectedMap,
      assets,
      noWrap: true,
      minZoom: map.getMinZoom(),
      maxZoom: map.getMaxZoom(),
      maxNativeZoom: 0,
      minNativeZoom: 0,
    });

    layer.addTo(map);

    const watermarkLayer = assets.watermarkUrl
      ? new GameTileLayer({
          selectedMap,
          assets,
          isWatermark: true,
          noWrap: true,
          minZoom: map.getMinZoom(),
          maxZoom: map.getMaxZoom(),
          maxNativeZoom: 0,
          minNativeZoom: 0,
          opacity: 0.2,
        })
      : null;

    watermarkLayer?.addTo(map);

    return () => {
      map.removeLayer(layer);
      if (watermarkLayer) map.removeLayer(watermarkLayer);
    };
  }, [map, selectedMap, assets]);

  return null;
};

export default GameMapTiles;
