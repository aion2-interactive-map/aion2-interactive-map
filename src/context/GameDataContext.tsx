// src/providers/GameDataProvider.tsx
import React, {createContext, useContext, useEffect, useState} from "react";
import type { GameMapMeta,MarkerTypeSubtype } from "@/types/game";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useMarkers} from "@/context/MarkersContext.tsx";
import { VISIBLE_SUBTYPES_STORAGE_PREFIX, VISIBLE_REGIONS_STORAGE_PREFIX } from "@/constants";

type GameDataContextValue = {
  visibleSubtypes?: Set<string>;
  setVisibleSubtypes: (visibleSubtypes: Set<string>) => void;
  visibleRegions?: Set<string>;
  setVisibleRegions: (visibleRegions: Set<string>) => void;
  allSubtypes: Map<string, MarkerTypeSubtype>;
  setAllSubtypes: (allSubtypes: Map<string, MarkerTypeSubtype>) => void;
  handleToggleSubtype: (subTypeId: string) => void;
  handleToggleRegion: (region: string) => void;
  showBorders: boolean;
  handleToggleBorders: () => void;
  handleShowAllSubtypes: () => void;
  handleHideAllSubtypes: () => void;
};

const GameDataContext = createContext<GameDataContextValue | null>(null);

type GameDataProviderProps = {
  children: React.ReactNode;
};

const saveVisibleData = (prefix: string, selectedMap: GameMapMeta | undefined, data: Set<string> | undefined) => {
  if (!selectedMap || !data) return;
  const storageKey = `${prefix}${selectedMap.name}`;
  try {
    const arr = Array.from(data);
    const stored = JSON.stringify(arr);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, stored);
    }
  } catch (e) {
    console.warn("Failed to save to localStorage", storageKey, e);
  }
}

const loadVisibleData = (prefix: string, selectedMap: GameMapMeta, validKeys: Set<string>) => {
  const storageKey = `${prefix}${selectedMap.name}`;
  try {
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey)
      : null;
    if (!stored) return null;
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

export const GameDataProvider: React.FC<GameDataProviderProps> = ({
                                                                    children,
                                                                  }) => {
  const [visibleSubtypes, setVisibleSubtypes] = useState<Set<string> | undefined>(undefined);
  const [visibleRegions, setVisibleRegions] = useState<Set<string> | undefined>(undefined);
  const [allSubtypes, setAllSubtypes] = useState<Map<string, MarkerTypeSubtype>>(new Map());
  const [showBorders, setShowBorders] = useState<boolean>(false);

  // const { regions } = useMarkers(selectedMap?.name);

  const { types, selectedMap } = useGameMap();
  const { regions } = useMarkers();

  // Initialize visibleSubtypes once when types are loaded
  useEffect(() => {
    if (!selectedMap || types.length === 0) return;
    const all = new Map<string, MarkerTypeSubtype>();
    types.forEach((cat) => {
      cat.subtypes.forEach((sub) => {
        sub.category = cat.name;
        all.set(sub.name, sub);
      });
    });
    setAllSubtypes(all);
    const validKeys = new Set(all.keys());
    const visible = loadVisibleData(VISIBLE_SUBTYPES_STORAGE_PREFIX, selectedMap, validKeys);
    if (visible) {
      setVisibleSubtypes(visible);
    } else {
      // DEFAULT: only "location" subtypes
      const defaultKeys = new Set<string>();
      all.forEach((sub, name) => {
        if (sub.category === "location" || (sub.name === "monolithMaterial" && selectedMap.type === "abyss")) {
          defaultKeys.add(name);
        }
      });
      setVisibleSubtypes(defaultKeys);
    }
  }, [selectedMap, types]);

  // Initialize visibleRegions once when regions are loaded
  useEffect(() => {
    if (!selectedMap || regions.length === 0) return;
    // setAllSubtypes(all);
    const validKeys = new Set(regions.map(x => x.name));
    const visible = loadVisibleData(VISIBLE_REGIONS_STORAGE_PREFIX, selectedMap, validKeys);
    if (visible) {
      setVisibleRegions(visible);
    } else {
      setVisibleRegions(validKeys);
    }
  }, [selectedMap, regions]);


  useEffect(() => {
    saveVisibleData(VISIBLE_SUBTYPES_STORAGE_PREFIX, selectedMap, visibleSubtypes)
  }, [selectedMap, visibleSubtypes]);

  useEffect(() => {
    saveVisibleData(VISIBLE_REGIONS_STORAGE_PREFIX, selectedMap, visibleRegions)
  }, [selectedMap, visibleRegions]);

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

  const handleToggleBorders = () => {
    setShowBorders(!showBorders);
  }


  return (
    <GameDataContext.Provider value={{
      visibleSubtypes,
      setVisibleSubtypes,
      visibleRegions,
      setVisibleRegions,
      allSubtypes,
      setAllSubtypes,
      handleToggleSubtype,
      handleToggleRegion,
      handleShowAllSubtypes,
      handleHideAllSubtypes,
      showBorders,
      handleToggleBorders,
    }}>
      {children}
    </GameDataContext.Provider>
  );
};

/**
 * 👇 Keep backward-compatible API
 * Replace old hook with this context-backed version
 */
export function useGameData(): GameDataContextValue {
  const ctx = useContext(GameDataContext);
  if (!ctx) {
    throw new Error("useGameData must be used inside <GameDataProvider>");
  }
  return ctx;
}
