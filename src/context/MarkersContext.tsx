import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import type {MarkerInstance, RawMarkersFile, RawRegionsFile, RegionInstance} from "@/types/game.ts";
import {useYamlLoader} from "@/hooks/useYamlLoader.ts";
import {useGameMap} from "@/context/GameMapContext.tsx";

type MarkersContextValue = {
  markers: MarkerInstance[];
  regions: RegionInstance[];
  loading: boolean;
  showLabels: boolean;
  setShowLabels: (value: boolean) => void;
  subtypeCounts: Map<string, number>;
  completedSet: Set<string>;
  completedCounts: Map<string, number>;
  toggleMarkerCompleted: (marker: MarkerInstance) => void;
  clearMarkerCompleted: () => void;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

type MarkersProviderProps = {
  children: React.ReactNode;
};

const COMPLETED_STORAGE_PREFIX = "aion2.completedMarkers.v1.";


export const MarkersProvider = ({children}: MarkersProviderProps) => {
  const [markers, setMarkers] = useState<MarkerInstance[]>([]);
  const [regions, setRegions] = useState<RegionInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const loadYaml = useYamlLoader();
  const { selectedMap } = useGameMap();


  // Set of completed marker keys for the *current map*.
  // Keys are "categoryId::subtypeId::markerId".
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    () => new Set(),
  );

  // --- Helper: build a completion key (no mapId inside, since we store per-map) ---
  const buildCompletedKey = useCallback(
    (marker: MarkerInstance) =>
      `${marker.id}`,
    [],
  );

  // --- Load markers for the selected map ---
  useEffect(() => {
    if (!selectedMap) {
      setMarkers([]);
      setRegions([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const raw = await loadYaml<RawMarkersFile>(
          `data/markers/${selectedMap?.name}.yaml`,
        );
        if (cancelled) return;
        const rawRegion = await loadYaml<RawRegionsFile>(
          `data/regions/${selectedMap?.name}.yaml`,
        )
        setMarkers(raw.markers);
        setRegions(rawRegion.regions);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setMarkers([]);
          setRegions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedMap, loadYaml]);

  // --- Total marker counts per subtype (N) ---
  const subtypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of markers) {
      const key = m.subtype;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [markers]);

  // --- Load completion state per map from localStorage ---
  useEffect(() => {
    if (!selectedMap) {
      setCompletedSet(new Set());
      return;
    }

    const storageKey = `${COMPLETED_STORAGE_PREFIX}${selectedMap.name}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setCompletedSet(new Set());
      return;
    }

    try {
      const parsed = JSON.parse(raw) as string[];
      setCompletedSet(new Set(parsed));
    } catch {
      setCompletedSet(new Set());
    }
  }, [selectedMap]);

  // --- Save completion state per map to localStorage ---
  useEffect(() => {
    if (!selectedMap) return;
    const storageKey = `${COMPLETED_STORAGE_PREFIX}${selectedMap.name}`;
    const arr = Array.from(completedSet);
    localStorage.setItem(storageKey, JSON.stringify(arr));
  }, [completedSet, selectedMap]);

  // --- Toggle a marker's completed state ---
  const toggleMarkerCompleted = useCallback(
    (marker: MarkerInstance) => {
      const key = buildCompletedKey(marker);

      setCompletedSet((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [buildCompletedKey],
  );

  const clearMarkerCompleted = useCallback(
    () => {
      setCompletedSet(new Set());
    }, [],
  )

  // --- Completed counts per subtype (X in X/N) ---
  const completedCounts = useMemo(() => {
    const map = new Map<string, number>();

    for (const marker of markers) {
      const subtypeKey = marker.subtype;
      const completedKey = buildCompletedKey(marker);
      if (!completedSet.has(completedKey)) continue;

      map.set(subtypeKey, (map.get(subtypeKey) ?? 0) + 1);
    }

    return map;
  }, [markers, completedSet, buildCompletedKey]);

  return (
    <MarkersContext.Provider value={{
      markers,
      regions,
      loading,
      showLabels,
      setShowLabels,
      subtypeCounts,
      completedSet,
      completedCounts,
      toggleMarkerCompleted,
      clearMarkerCompleted,
    }}>
      {children}
    </MarkersContext.Provider>
  );
}

export function useMarkers(): MarkersContextValue {
  const ctx = useContext(MarkersContext);
  if (!ctx) {
    throw new Error("useMarkers must be used inside <MarkersProvider>");
  }
  return ctx;
}