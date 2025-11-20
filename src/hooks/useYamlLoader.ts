import { useCallback } from "react";
import { fetchYaml } from "../utils/yamlLoader";
import { useDataMode } from "./useDataMode.tsx";

export function useYamlLoader() {
  const { getBaseUrl } = useDataMode();

  const loadYaml = useCallback(
    <T,>(path: string) => {
      const base = getBaseUrl().replace(/\/+$/, "");
      const cleaned = path.replace(/^\/+/, "");
      const url = `${base}/${cleaned}`;
      return fetchYaml<T>(url);
    },
    [getBaseUrl],
  );

  return loadYaml;
}
