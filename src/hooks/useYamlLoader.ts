import { useCallback } from "react";
import { fetchYaml } from "../utils/yamlLoader";
import { useDataMode } from "./useDataMode.tsx";
import {getStaticBaseUrl} from "@/utils/dataMode.ts";

export function useYamlLoader() {
  const { getBaseUrl } = useDataMode();

  const loadYaml = useCallback(
    <T,>(path: string) => {
      let base;
      if (path.startsWith("data/items") || path.startsWith("data/classes")) {
        base = getStaticBaseUrl();
      } else {
        base = getBaseUrl().replace(/\/+$/, "");
      }

      const cleaned = path.replace(/^\/+/, "");
      const url = `${base}/${cleaned}?build=${__BUILD_GIT_COMMIT__}`;
      return fetchYaml<T>(url);
    },
    [getBaseUrl],
  );

  return loadYaml;
}
