import React, { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type {GameMapMeta} from "../types/game.ts";
import {getStaticUrl} from "../utils/url.ts";

type GameTilesProps = {
  selectedMap: GameMapMeta
};

type GameTileLayerOptions = L.TileLayerOptions & GameTilesProps & {
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
    console.log("[GameTileLayer] getTileUrl", coords);

    const { selectedMap, isWatermark } = this.gameOptions;

    // Leaflet coords.x, coords.y are tile indices.
    // Your naming is "Map_YY_XX.png" with 2-digit zero padding.
    const x = coords.x;
    const y = selectedMap.tilesCountY + coords.y;

    // Optional: clamp to grid if you use noWrap
    if (x < 0 || y < 0 || x >= selectedMap.tilesCountX || y >= selectedMap.tilesCountY) {
      // You can return a transparent tile or some placeholder
      return "";
    }

    if (isWatermark) {
      return getStaticUrl('images/watermark.png');
    }

    const xStr = String(x).padStart(2, "0");
    const yStr = String(y).padStart(2, "0");

    console.log(coords, xStr, yStr)
    const relPath = `UI/Map/WorldMap/${selectedMap.name}/Res/${selectedMap.name}_${xStr}_${yStr}.png`;
    return getStaticUrl(relPath);
  }



}


const GameMapTiles: React.FC<GameTilesProps> = ({ selectedMap }) => {
  const map = useMap();
  // console.log("[GameMapTiles] render", { selectedMap, map });

  useEffect(() => {
    console.log("[GameMapTiles] useEffect mount", { selectedMap, map });

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
      console.log("[GameMapTiles] useEffect cleanup");

      map.removeLayer(layer);
      map.removeLayer(watermarkLayer);
    };
  }, [map, selectedMap]);

  return null;
};

export default GameMapTiles;
