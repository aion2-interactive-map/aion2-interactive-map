import { useEffect, useState } from "react";
import { useYamlLoader } from "../hooks/useYamlLoader";
import type {
  GameMapMeta,
  MapsFile,
  MarkerTypeCategory,
  TypesFile,
} from "../types/game";

export function useGameData() {
  const [maps, setMaps] = useState<GameMapMeta[]>([]);
  const [types, setTypes] = useState<MarkerTypeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const loadYaml = useYamlLoader();

  useEffect(() => {
    let cancelled = false;
    console.log("useGameData");

    async function load() {
      try {
        const [mapsData, typesData] = await Promise.all([
          loadYaml<MapsFile>("data/maps.yaml"),
          loadYaml<TypesFile>("data/types.yaml"),
        ]);

        if (cancelled) return;
        setMaps(mapsData.maps);
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

  return { maps, types, loading };
}
