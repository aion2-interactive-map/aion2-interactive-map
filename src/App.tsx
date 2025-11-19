// src/App.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";

import TopNavbar from "./components/TopNavbar";
import MapSidebar from "./components/MapSidebar";
import GameMapView from "./components/GameMapView";

import { Spinner } from "@heroui/react";

import { useGameData } from "./hooks/useGameData";
import { useMarkers } from "./hooks/useMarkers";

import type { GameMapMeta, MapRef } from "./types/game";
import {getQueryParam, setQueryParam} from "./utils/url.ts";

const App: React.FC = () => {
  const VISIBLE_STORAGE_PREFIX = "aion2.visibleSubtypes.v1.";

  const { maps, types, loading: loadingGameData } = useGameData();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // visibleSubtypes: key = `${categoryId}::${subtypeId}`
  const [visibleSubtypes, setVisibleSubtypes] = useState<Set<string>>(
    () => new Set(),
  );
  const [allSubtypes, setAllSubtypes] = useState<Set<string>>(new Set());

  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Initialize selected map
  useEffect(() => {
    if (!maps || maps.length === 0) return;
    if (selectedMapId) {
      setQueryParam("map", selectedMapId);
      return;
    }
    const initial = getQueryParam("map");
    if (initial && maps.some((m) => m.id === initial)) {
      setSelectedMapId(initial);
    } else if (maps.length > 0 && !selectedMapId) {
      // optional fallback: load first map
      const first = maps[0].id;
      setSelectedMapId(first);
      setQueryParam("map", first);
    }
  }, [maps, selectedMapId]);

  // Initialize visibleSubtypes once when types are loaded
  useEffect(() => {
    if (!selectedMapId || types.length === 0) return;

    const all = new Set<string>();
    types.forEach((cat) => {
      cat.subtypes.forEach((sub) => {
        all.add(`${cat.id}::${sub.id}`);
      });
    });
    setAllSubtypes(all);

    const storageKey = `${VISIBLE_STORAGE_PREFIX}${selectedMapId}`;
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey)
      : null;

    if (stored != null) {
      try {
        console.log("Load visibleSubtypes", stored);
        const parsed = JSON.parse(stored) as string[];
        const set = new Set<string>();

        // Only keep keys that still exist in current types
        const validKeys = new Set<string>();
        types.forEach((cat) => {
          cat.subtypes.forEach((sub) => {
            validKeys.add(`${cat.id}::${sub.id}`);
          });
        });

        parsed.forEach((key) => {
          if (validKeys.has(key)) set.add(key);
        });

        setVisibleSubtypes(set);
        return;
      } catch (e) {
        console.warn("Failed to parse visibleSubtypes from localStorage", e);
        // Fall through to "select all"
      }
    }
    // Default: all visible for this map
    setVisibleSubtypes(all);

  }, [selectedMapId, types]);

  useEffect(() => {
    if (!selectedMapId) return;
    const storageKey = `${VISIBLE_STORAGE_PREFIX}${selectedMapId}`;
    try {
      const arr = Array.from(visibleSubtypes);
      const stored = JSON.stringify(arr);
      console.log("Save visibleSubtypes", stored);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, stored);
      }
    } catch (e) {
      console.warn("Failed to save visibleSubtypes to localStorage", e);
    }
  }, [selectedMapId, visibleSubtypes]);

  const {
    markers,
    loading: loadingMarkers,
    subtypeCounts,
    completedSet,
    completedCounts,
    toggleMarkerCompleted,
  } = useMarkers(selectedMapId);

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
      const height = meta.tileWidth * meta?.tilesCountX;
      const width = meta.tileWidth * meta?.tilesCountY;
        map.setView(
        [height / 2, width / 2],
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

  const handleShowAllSubtypes = () => {
    setVisibleSubtypes(new Set(allSubtypes));
  };

  const handleHideAllSubtypes = () => {
    setVisibleSubtypes(new Set<string>());
  };

  if (loadingGameData && !selectedMap) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Spinner label="Loading maps..." />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <TopNavbar />

      <div className="flex flex-1 overflow-hidden">
        <MapSidebar
          maps={maps}
          types={types}
          selectedMapId={selectedMapId}
          onMapChange={handleMapChange}
          loadingMarkers={loadingMarkers}
          subtypeCounts={subtypeCounts}
          completedCounts={completedCounts}
          visibleSubtypes={visibleSubtypes}
          onToggleSubtype={handleToggleSubtype}
          showLabels={showLabels}
          onToggleShowLabels={setShowLabels}
          onShowAllSubtypes={handleShowAllSubtypes}
          onHideAllSubtypes={handleHideAllSubtypes}
        />

        <GameMapView
          selectedMap={selectedMap}
          markers={markers}
          mapRef={mapRef}
          visibleSubtypes={visibleSubtypes}
          types={types}
          showLabels={showLabels}
          completedSet={completedSet}
          toggleMarkerCompleted={toggleMarkerCompleted}
        />
      </div>
    </div>
  );
};

export default App;
