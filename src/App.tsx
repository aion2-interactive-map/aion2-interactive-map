// src/App.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";

import TopNavbar from "./components/TopNavbar";
import MapSidebar from "./components/MapSidebar";
import GameMapView from "./components/GameMapView";

import { Spinner } from "@heroui/react";

import { useGameData } from "./hooks/useGameData";
import { useMarkers } from "./hooks/useMarkers";

import type { GameMapMeta, MapRef } from "./types/game";

const App: React.FC = () => {
  const { maps, types, loading: loadingGameData } = useGameData();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // visibleSubtypes: key = `${categoryId}::${subtypeId}`
  const [visibleSubtypes, setVisibleSubtypes] = useState<Set<string>>(
    () => new Set(),
  );

  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Initialize selected map
  useEffect(() => {
    if (!selectedMapId && maps.length > 0) {
      setSelectedMapId(maps[0].id);
    }
  }, [maps, selectedMapId]);

  // Initialize visibleSubtypes once when types are loaded
  useEffect(() => {
    if (types.length === 0) return;
    if (visibleSubtypes.size > 0) return;

    const all = new Set<string>();
    types.forEach((cat) => {
      cat.subtypes.forEach((sub) => {
        all.add(`${cat.id}::${sub.id}`);
      });
    });
    setVisibleSubtypes(all);
  }, [types, visibleSubtypes.size]); // using size so we don't depend on the Set identity

  const { markers, loading: loadingMarkers, subtypeCounts } =
    useMarkers(selectedMapId);

  const selectedMap: GameMapMeta | null = useMemo(
    () => maps.find((m) => m.id === selectedMapId) ?? null,
    [maps, selectedMapId],
  );

  const mapRef = useRef<MapRef>(null);

  const handleMapChange = (mapId: string) => {
    setSelectedMapId(mapId);
    const map = mapRef.current;
    const meta = maps.find((m) => m.id === mapId);
    if (map && meta) {
      map.setView(
        [meta.height / 2, meta.width / 2],
        map.getZoom(),
      );
    }
  };

  const handleToggleSubtype = (categoryId: string, subtypeId: string) => {
    const key = `${categoryId}::${subtypeId}`;
    setVisibleSubtypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loadingGameData && !selectedMap) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Spinner label="Loading maps..." />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-content1 text-foreground">
      <TopNavbar />

      <div className="flex flex-1 overflow-hidden">
        <MapSidebar
          maps={maps}
          types={types}
          selectedMapId={selectedMapId}
          onMapChange={handleMapChange}
          loadingMarkers={loadingMarkers}
          subtypeCounts={subtypeCounts}
          visibleSubtypes={visibleSubtypes}
          onToggleSubtype={handleToggleSubtype}
          showLabels={showLabels}
          onToggleShowLabels={setShowLabels}
        />

        <GameMapView
          selectedMap={selectedMap}
          markers={markers}
          mapRef={mapRef}
          visibleSubtypes={visibleSubtypes}
          types={types}
          showLabels={showLabels}
        />
      </div>
    </div>
  );
};

export default App;
