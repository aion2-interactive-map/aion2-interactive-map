import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import type {MarkerInstance, MarkerWithTranslations, RawMarkersFile, RawRegionsFile, RegionInstance} from "@/types/game.ts";
import {useYamlLoader} from "@/hooks/useYamlLoader.ts";
import {useGameMap} from "@/context/GameMapContext.tsx";
import {useTranslation} from "react-i18next";
import { COMPLETED_MARKERS_V1_PREFIX, COMPLETED_MARKERS_V2_PREFIX } from "@/constants";

type MarkersContextValue = {
  markers: MarkerWithTranslations[];
  markersById: Record<string, MarkerWithTranslations>;
  regions: RegionInstance[];
  loading: boolean;

  showLabels: boolean;
  setShowLabels: (value: boolean) => void;

  subtypeCounts: Record<string, number>;
  completedCounts: Record<string, number>;

  completedBySubtype: Record<string, Set<number>>;
  // completedSet: Record<string, number>;
  // buildCompletedKey: (marker: MarkerInstance) => string;

  toggleMarkerCompleted: (marker: MarkerInstance) => void;
  clearMarkerCompleted: () => void;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

type MarkersProviderProps = {
  children: React.ReactNode;
};

function loadV1(map: string): Set<string> {
  const key = `${COMPLETED_MARKERS_V1_PREFIX}.${map}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function clearV1(map: string): void {
  const key = `${COMPLETED_MARKERS_V1_PREFIX}.${map}`;
  localStorage.removeItem(key);
}

function saveV2Subtype(map: string, subtype: string, set: Set<number>) {
  const key = `${COMPLETED_MARKERS_V2_PREFIX}.${map}.${subtype}`;
  localStorage.setItem(key, JSON.stringify([...set]));
}

function loadV2Subtype(map: string, subtype: string): Set<number> {
  const key = `${COMPLETED_MARKERS_V2_PREFIX}.${map}.${subtype}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw).filter((v: unknown) => typeof v === "number");
    return new Set(arr);
  } catch {
    return new Set();
  }
}


export const MarkersProvider = ({children}: MarkersProviderProps) => {
  const [baseMarkers, setBaseMarkers] = useState<MarkerInstance[]>([]);
  const [regions, setRegions] = useState<RegionInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const loadYaml = useYamlLoader();

  const { selectedMap } = useGameMap();
  const markerNs = `markers/${selectedMap?.name}`;
  const {t, i18n} = useTranslation([markerNs]);

  // Set of completed marker keys for the *current map*.
  // Keys are "categoryId::subtypeId::markerId".
  // const [completedSet, setCompletedSet] = useState<Set<string>>(
  //   () => new Set(),
  // );
  const [completedBySubtype, setCompletedBySubtype] = useState<
    Record<string, Set<number>>
  >({});


  // --- Helper: build a completion key (no mapId inside, since we store per-map) ---
  // const buildCompletedKey = useCallback(
  //   (marker: MarkerInstance) =>
  //     `${marker.subtype}::${marker.indexInSubtype}`,
  //   [],
  // );

  const markers: MarkerWithTranslations[] = useMemo(() => {
    if (!selectedMap) return [];

    return baseMarkers.map((m) => {
      const localizedName = t(`${markerNs}:${m.id}.name`, m.name ?? "");
      const localizedDescription = t(`${markerNs}:${m.id}.description`, "");
      return {
        ...m,
        localizedName,
        localizedDescription,
      };
    });
  }, [baseMarkers, selectedMap, t, i18n.language]);

  const markersById: Record<string, MarkerWithTranslations> = useMemo(() => {
    const dict: Record<string, MarkerWithTranslations> = {};
    for (const m of markers) {
      dict[m.id] = m;
    }
    return dict;
  }, [markers]);


  // --- Load markers for the selected map ---
  useEffect(() => {
    if (!selectedMap) {
      setBaseMarkers([]);
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
        setBaseMarkers(raw.markers || []);
        setRegions(rawRegion.regions || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setBaseMarkers([]);
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

  // --- Total unique indexInSubtype counts per subtype (N) ---
  const subtypeCounts = useMemo<Record<string, number>>(() => {
    const indexSets: Record<string, Set<number>> = {};

    for (const m of baseMarkers) {
      if (!indexSets[m.subtype]) indexSets[m.subtype] = new Set();
      indexSets[m.subtype].add(m.indexInSubtype);
    }

    const counts: Record<string, number> = {};
    for (const subtype of Object.keys(indexSets)) {
      counts[subtype] = indexSets[subtype].size;
    }

    return counts;
  }, [baseMarkers]);

  // --- Completed counts per subtype (X in X/N) ---
  const completedCounts = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};

    for (const [subtype, indexSet] of Object.entries(completedBySubtype)) {
      result[subtype] = indexSet.size;
    }

    return result;
  }, [completedBySubtype]);

  /* -----------------------------------------------
   * Load completion state (v2, fallback to v1)
   * -------------------------------------------- */
  useEffect(() => {
    if (!selectedMap) {
      setCompletedBySubtype({});
      return;
    }

    const mapName = selectedMap.name;

    // 1. Collect all subtypes in this map
    const subtypes = new Set(baseMarkers.map((m) => m.subtype));

    const loaded: Record<string, Set<number>> = {};

    let v2Found = false;

    for (const subtype of subtypes) {
      const v2 = loadV2Subtype(mapName, subtype);
      if (v2.size > 0) v2Found = true;
      loaded[subtype] = v2;
    }

    if (v2Found) {
      // normal load
      setCompletedBySubtype(loaded);
      return;
    }

    // 2. No v2 → migrate from v1
    const v1 = loadV1(mapName);
    if (v1.size === 0) {
      setCompletedBySubtype(loaded);
      return;
    }

    console.log("[Markers] Migrating V1 → V2");

    // Build subtype→Set(index) from v1 uuid keys
    const migrated: Record<string, Set<number>> = {};
    for (const m of baseMarkers) {
      const uuid = m.id;
      if (!v1.has(uuid)) continue;

      if (!migrated[m.subtype]) migrated[m.subtype] = new Set();
      migrated[m.subtype]!.add(m.indexInSubtype);
    }

    // Save as v2
    for (const subtype of Object.keys(migrated)) {
      saveV2Subtype(mapName, subtype, migrated[subtype]!);
    }

    // Merge into empty-loaded
    setCompletedBySubtype(() => ({ ...loaded, ...migrated }));
  }, [selectedMap, baseMarkers]);

  // --- Save completion state per map to localStorage ---

  // const saveCompletedMarkers = (selectedMap: GameMapMeta, data: Set<string>) => {
  //   const storageKey = `${COMPLETED_V2_PREFIX}${selectedMap.name}`;
  //   const arr = Array.from(data);
  //   localStorage.setItem(storageKey, JSON.stringify(arr));
  //   console.log("Save", storageKey, arr)
  // };

  // --- Toggle a marker's completed state ---
  const toggleMarkerCompleted = useCallback(
    (marker: MarkerInstance) => {
      if (!selectedMap) return;
      const mapName = selectedMap.name;

      const { subtype, indexInSubtype } = marker;

      setCompletedBySubtype((prev) => {
        const next = { ...prev };
        const set = new Set(prev[subtype] ?? []);

        if (set.has(indexInSubtype)) set.delete(indexInSubtype);
        else set.add(indexInSubtype);

        next[subtype] = set;

        saveV2Subtype(mapName, subtype, set);
        return next;
      });
    },
    [selectedMap]
  );

  const clearMarkerCompleted = useCallback(() => {
    if (!selectedMap) return;
    const mapName = selectedMap.name;
    clearV1(mapName);
    setCompletedBySubtype((prev) => {
      const next: Record<string, Set<number>> = {};
      for (const subtype of Object.keys(prev)) {
        next[subtype] = new Set();
        saveV2Subtype(mapName, subtype, new Set());
      }
      return next;
    });
  }, [selectedMap]);


  return (
    <MarkersContext.Provider value={{
      markers,
      markersById,
      regions,
      loading,
      showLabels,
      setShowLabels,
      subtypeCounts,
      completedCounts,
      completedBySubtype,
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