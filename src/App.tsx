// src/App.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";

import TopNavbar from "./components/TopNavbar";
import MapSidebar from "./components/MapSidebar";
import GameMapView from "./components/GameMapView";
import IntroModal from "./components/IntroModal";

import { Spinner } from "@heroui/react";

import { useGameData } from "./hooks/useGameData";
import { useMarkers } from "./hooks/useMarkers";

import type {GameMapMeta, MapRef, MarkerTypeSubtype} from "./types/game";
import {getQueryParam, setQueryParam} from "./utils/url.ts";

const VISIBLE_SUBTYPES_STORAGE_PREFIX = "aion2.visibleSubtypes.v1.";
const VISIBLE_REGIONS_STORAGE_PREFIX = "aion2.visibleRegions.v1.";

const saveVisibleData = (prefix: string, selectedMapId: string | null, data: Set<string> | null) => {
  if (!selectedMapId || !data) return;
  const storageKey = `${prefix}${selectedMapId}`;
  try {
    const arr = Array.from(data);
    const stored = JSON.stringify(arr);
    console.log("Save", storageKey, stored);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, stored);
    }
  } catch (e) {
    console.warn("Failed to save to localStorage", storageKey, e);
  }
}

const loadVisibleData = (prefix: string, selectedMapId: string | null, validKeys: Set<string>) => {
  const storageKey = `${prefix}${selectedMapId}`;
  try {
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey)
      : null;
    if (!stored) throw new Error("Storage is missing");
    console.log("Load", storageKey, stored);
    const parsed = JSON.parse(stored) as string[];
    const set = new Set<string>();
    parsed.forEach((key) => {
      if (validKeys.has(key)) set.add(key);
    });
    return set;
  } catch (e) {
    console.warn("Failed to parse from localStorage", storageKey, e);
    return null;
  }
}

const App: React.FC = () => {


  const { maps, types, loading: loadingGameData } = useGameData();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const {
    markers,
    regions,
    loading: loadingMarkers,
    subtypeCounts,
    completedSet,
    completedCounts,
    toggleMarkerCompleted,
    clearMarkerCompleted,
  } = useMarkers(selectedMapId);

  // visibleSubtypes: key = `${categoryId}::${subtypeId}`
  const [visibleSubtypes, setVisibleSubtypes] = useState<Set<string> | null>(null);
  const [visibleRegions, setVisibleRegions] = useState<Set<string> | null>(null);
  const [allSubtypes, setAllSubtypes] = useState<Map<string, MarkerTypeSubtype>>(new Map());
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(true);

  // Initialize selected map
  useEffect(() => {
    if (!maps || maps.length === 0) return;
    if (selectedMapId) {
      setQueryParam("map", selectedMapId);
      return;
    }
    const initial = getQueryParam("map");
    if (initial && maps.some((m) => m.name === initial)) {
      setSelectedMapId(initial);
    } else if (maps.length > 0 && !selectedMapId) {
      // optional fallback: load first map
      const first = maps[0].name;
      setSelectedMapId(first);
      setQueryParam("map", first);
    }
  }, [maps, selectedMapId]);

  // Initialize visibleSubtypes once when types are loaded
  useEffect(() => {
    if (!selectedMapId || types.length === 0) return;
    const all = new Map<string, MarkerTypeSubtype>();
    types.forEach((cat) => {
      cat.subtypes.forEach((sub) => {
        sub.category = cat.name;
        all.set(sub.name, sub);
      });
    });
    setAllSubtypes(all);
    const validKeys = new Set(all.keys());
    const visible = loadVisibleData(VISIBLE_SUBTYPES_STORAGE_PREFIX, selectedMapId, validKeys);
    if (visible) {
      setVisibleSubtypes(visible);
    } else {
      setVisibleSubtypes(validKeys);
    }
  }, [selectedMapId, types]);

  // Initialize visibleRegions once when regions are loaded
  useEffect(() => {
    if (!selectedMapId || regions.length === 0) return;
    // setAllSubtypes(all);
    const validKeys = new Set(regions.map(x => x.name));
    const visible = loadVisibleData(VISIBLE_REGIONS_STORAGE_PREFIX, selectedMapId, validKeys);
    if (visible) {
      setVisibleRegions(visible);
    } else {
      setVisibleRegions(validKeys);
    }
  }, [selectedMapId, regions]);


  useEffect(() => {
    console.log("saveVisibleData", selectedMapId, visibleSubtypes)
    saveVisibleData(VISIBLE_SUBTYPES_STORAGE_PREFIX, selectedMapId, visibleSubtypes)
  }, [selectedMapId, visibleSubtypes]);

  useEffect(() => {
    console.log("saveVisibleData", selectedMapId, visibleRegions)
    saveVisibleData(VISIBLE_REGIONS_STORAGE_PREFIX, selectedMapId, visibleRegions)
  }, [selectedMapId, visibleRegions]);



  const selectedMap: GameMapMeta | null = useMemo(
    () => maps.find((m) => m.name === selectedMapId) ?? null,
    [maps, selectedMapId],
  );

  const mapRef = useRef<MapRef>(null);

  const handleMapChange = (mapId: string) => {
    setSelectedMapId(mapId);
    const map = mapRef.current;
    const meta = maps.find((m) => m.name === mapId);
    if (map && meta) {
      const height = meta.tileWidth * meta?.tilesCountY;
      const width = meta.tileWidth * meta?.tilesCountX;
        map.setView(
        [height / 2, width / 2],
        map.getZoom(),
      );
    }
  };

  const handleToggleSubtype = (subtypeId: string) => {
    setVisibleSubtypes((prev) => {
      const next = new Set(prev);
      if (next.has(subtypeId)) next.delete(subtypeId);
      else next.add(subtypeId);
      return next;
    });
  };

  const handleToggleRegion = (regionId: string) => {
    setVisibleRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  };

  const handleShowAllSubtypes = () => {
    setVisibleSubtypes(new Set(allSubtypes.keys()));
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
      <TopNavbar
        onOpenIntroModal={() => setIsIntroOpen(true)}
      />

      <IntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
      />

      <div className="flex flex-1 overflow-hidden">
        <MapSidebar
          maps={maps}
          regions={regions}
          types={types}
          selectedMapId={selectedMapId}
          onMapChange={handleMapChange}
          loadingMarkers={loadingMarkers}
          subtypeCounts={subtypeCounts}
          completedCounts={completedCounts}
          visibleSubtypes={visibleSubtypes || new Set()}
          onToggleSubtype={handleToggleSubtype}
          visibleRegions={visibleRegions || new Set()}
          onToggleRegion={handleToggleRegion}
          showLabels={showLabels}
          onToggleShowLabels={setShowLabels}
          onShowAllSubtypes={handleShowAllSubtypes}
          onHideAllSubtypes={handleHideAllSubtypes}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
          onClearMarkerCompleted={clearMarkerCompleted}
        />

        <GameMapView
          selectedMap={selectedMap}
          markers={markers}
          mapRef={mapRef}
          visibleSubtypes={visibleSubtypes || new Set()}
          types={types}
          subtypes={allSubtypes}
          showLabels={showLabels}
          completedSet={completedSet}
          toggleMarkerCompleted={toggleMarkerCompleted}
        />

      </div>
    </div>
  );
};

export default App;
