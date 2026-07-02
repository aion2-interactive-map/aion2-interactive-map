import React, { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";
import { getStaticUrl } from "@/lib/url";

type GameTilesProps = {
  selectedMap: GameMapMeta;
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
    const { selectedMap, isWatermark } = this.gameOptions;

    // Leaflet coords.x, coords.y are tile indices.
    // Naming is "Map_YY_XX.webp" with 2-digit zero padding.
    const x = coords.x;
    const y = selectedMap.tilesCountY + coords.y;

    // Clamp to grid (noWrap)
    if (
      x < 0 ||
      y < 0 ||
      x >= selectedMap.tilesCountX ||
      y >= selectedMap.tilesCountY
    ) {
      return "";
    }

    if (isWatermark) {
      return getStaticUrl("images/watermark.webp");
    }

    const xStr = String(x).padStart(2, "0");
    const yStr = String(y).padStart(2, "0");

    const relPath = `UI/Map/WorldMap/${selectedMap.name}/Res/${selectedMap.name}_${xStr}_${yStr}.webp`;
    return getStaticUrl(relPath);
  }
}

const GameMapTiles: React.FC<GameTilesProps> = ({ selectedMap }) => {
  const map = useMap();

  useEffect(() => {
    const layer = new GameTileLayer({
      selectedMap,
      noWrap: true,
      minZoom: map.getMinZoom(),
      maxZoom: map.getMaxZoom(),
      maxNativeZoom: 0,
      minNativeZoom: 0,
    });

    layer.addTo(map);

    const watermarkLayer = new GameTileLayer({
      selectedMap,
      isWatermark: true,
      noWrap: true,
      minZoom: map.getMinZoom(),
      maxZoom: map.getMaxZoom(),
      maxNativeZoom: 0,
      minNativeZoom: 0,
      opacity: 0.2,
    });

    watermarkLayer.addTo(map);

    return () => {
      map.removeLayer(layer);
      map.removeLayer(watermarkLayer);
    };
  }, [map, selectedMap]);

  return null;
};

export default GameMapTiles;
