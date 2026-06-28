import type {GameMapMeta, MapsFile, MarkerTypeCategory, TypesFile} from "@/types/game.ts";
import React, {createContext, useContext, useEffect, useState} from "react";
import {useYamlLoader} from "@/hooks/useYamlLoader.ts";
import {getQueryParam, setQueryParam} from "@/utils/url.ts";

type GameMapContextValue = {
  maps: GameMapMeta[];
  types: MarkerTypeCategory[];
  loading: boolean;
  selectedMap?: GameMapMeta;
  setSelectedMap: (map?: GameMapMeta) => void;
}

const GameMapContext = createContext<GameMapContextValue | null>(null);

type GameMapProviderProps = {
  children: React.ReactNode;
};

export const GameMapProvider: React.FC<GameMapProviderProps> = ({children}: GameMapProviderProps) => {
  const [maps, setMaps] = useState<GameMapMeta[]>([]);
  const [types, setTypes] = useState<MarkerTypeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState<GameMapMeta | undefined>(undefined);

  const loadYaml = useYamlLoader();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [mapsData, typesData] = await Promise.all([
          loadYaml<MapsFile>("data/maps.yaml"),
          loadYaml<TypesFile>("data/types.yaml"),
        ]);

        if (cancelled) return;

        setMaps(mapsData.maps.filter((map) => map.isVisible));
        setTypes(typesData.categories);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadYaml]);

  // Initialize selected map
  useEffect(() => {
    if (!maps || maps.length === 0) return;
    const isIndexPage = window.location.pathname === "/";

    if (selectedMap) {
      if (isIndexPage) {
        setQueryParam("map", selectedMap.name);
      }
      return;
    }

    const initialMapId = isIndexPage ? getQueryParam("map") : null;
    if (initialMapId) {
      const matchedMap = maps.find((m) => m.name === initialMapId);
      setSelectedMap(matchedMap);
      return;
    }
    if (maps.length > 0 && !selectedMap) {
      // optional fallback: load first map
      setSelectedMap(maps[0]);
      if (isIndexPage) {
        setQueryParam("map", maps[0].name);
      }
    }
  }, [maps, selectedMap]);


  return (
    <GameMapContext.Provider value={{
      maps,
      types,
      loading,
      selectedMap,
      setSelectedMap,
    }}>
      {children}
    </GameMapContext.Provider>
  )

}

export function useGameMap(): GameMapContextValue {
  const ctx = useContext(GameMapContext);
  if (!ctx) {
    throw new Error("useGameMap must be used inside <GameMapProvider>");
  }
  return ctx;
}