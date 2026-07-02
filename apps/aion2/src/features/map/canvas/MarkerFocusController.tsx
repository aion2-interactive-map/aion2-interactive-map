import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { GameMapMeta } from "@gamemap/data-contract";
import type { EngineMarker } from "@/features/map/engineTypes";
import { dataToLatLng } from "@gamemap/map-engine";

type MarkerFocusControllerProps = {
  map: GameMapMeta;
  markersById: ReadonlyMap<string, EngineMarker>;
  selectedMarkerId: string | null | undefined;
  selectedPosition: { x: number; y: number } | null | undefined;
  /** Duration (seconds) of the fly-to animation. */
  flyToDuration: number;
};

/**
 * Flies the map to the selected marker / search result. Navigation only — it
 * deliberately renders NO pin: the old focus pin was permanent and had no way
 * to be dismissed, so it just accumulated on every search click.
 */
const MarkerFocusController: React.FC<MarkerFocusControllerProps> = ({
  map,
  markersById,
  selectedMarkerId,
  selectedPosition,
  flyToDuration,
}) => {
  const leafletMap = useMap();

  // Key the fly-to on the selected marker's COORDS, not the marker object or
  // the lookup map: `EngineMarker`s are rebuilt whenever app-side state (e.g.
  // completion) changes, and re-running on that would fly the map back to the
  // marker mid-interaction.
  const marker = selectedMarkerId ? markersById.get(selectedMarkerId) : undefined;
  const markerX = marker?.x;
  const markerY = marker?.y;

  useEffect(() => {
    if (!leafletMap || !selectedMarkerId) return;
    if (markerX == null || markerY == null) return;

    // DATA (image-space) → Leaflet LatLng with the single vertical flip.
    const latLng = dataToLatLng(map, markerX, markerY);

    leafletMap.flyTo(latLng, leafletMap.getZoom(), { duration: flyToDuration });
  }, [leafletMap, selectedMarkerId, markerX, markerY, map, flyToDuration]);

  useEffect(() => {
    if (!leafletMap || !selectedPosition) return;
    const latLng = dataToLatLng(map, selectedPosition.x, selectedPosition.y);
    leafletMap.flyTo(latLng, leafletMap.getZoom(), { duration: flyToDuration });
  }, [leafletMap, selectedPosition, map, flyToDuration]);

  return null;
};

export default MarkerFocusController;
