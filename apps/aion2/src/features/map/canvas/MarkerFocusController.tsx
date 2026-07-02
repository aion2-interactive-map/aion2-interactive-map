import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMarkers } from "@/context/MarkersContext";
import { useGameMap } from "@/context/GameMapContext";
import { MAP_FLY_TO_DURATION } from "@/lib/constants";
import { dataToLatLng } from "@gamemap/map-engine";

type MarkerFocusControllerProps = {
  selectedMarkerId: string | null | undefined;
  selectedPosition: { x: number; y: number } | null | undefined;
};

/**
 * Flies the map to the selected marker / search result. Navigation only — it
 * deliberately renders NO pin: the old focus pin was permanent and had no way
 * to be dismissed, so it just accumulated on every search click.
 */
const MarkerFocusController: React.FC<MarkerFocusControllerProps> = ({
  selectedMarkerId,
  selectedPosition,
}) => {
  const map = useMap();
  const { markersById } = useMarkers();
  const { selectedMap } = useGameMap();

  useEffect(() => {
    if (!map || !selectedMarkerId || !selectedMap) return;

    const marker = markersById[selectedMarkerId];
    if (!marker) return;

    // DATA (image-space) → Leaflet LatLng with the single vertical flip.
    const latLng = dataToLatLng(selectedMap, marker.x, marker.y);

    map.flyTo(latLng, map.getZoom(), { duration: MAP_FLY_TO_DURATION });
  }, [map, selectedMarkerId, markersById, selectedMap]);

  useEffect(() => {
    if (!map || !selectedPosition || !selectedMap) return;
    const latLng = dataToLatLng(
      selectedMap,
      selectedPosition.x,
      selectedPosition.y,
    );
    map.flyTo(latLng, map.getZoom(), { duration: MAP_FLY_TO_DURATION });
  }, [map, selectedPosition, selectedMap]);

  return null;
};

export default MarkerFocusController;
