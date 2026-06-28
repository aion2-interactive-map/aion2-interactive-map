import { useCallback } from "react";
import { fetchYaml } from "../utils/yamlLoader";
import { useDataMode } from "./useDataMode.tsx";
import {getStaticBaseUrl} from "@/utils/dataMode.ts";

export function useYamlLoader() {
  const { getBaseUrl } = useDataMode();

  const loadYaml = useCallback(
    <T,>(path: string) => {
      let base;
      if (path.startsWith("data/markers") || path.startsWith("data/regions") || path.startsWith("data/maps") || path.startsWith("data/types")) {
        base = getBaseUrl().replace(/\/+$/, "");
      } else {
        base = getStaticBaseUrl();
      }

      const cleaned = path.replace(/^\/+/, "");
      const url = `${base}/${cleaned}?build=${__BUILD_GIT_COMMIT__}`;
      return fetchYaml<T>(url);
    },
    [getBaseUrl],
  );

  return loadYaml;
}
