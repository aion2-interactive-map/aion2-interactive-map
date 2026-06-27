import { parse } from "yaml";
import { getDataBaseUrl } from "@/lib/url";

export async function fetchYaml<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  return parse(await res.text()) as T;
}

/**
 * Load a parsed-game-dataset file from the `data/` repo.
 * `rel` is e.g. "data/maps.yaml" or "data/markers/World_L_A.yaml".
 * - Prod: `VITE_DATA_BASE_URL` host (the leading `data/` is the on-host path).
 * - Dev: Vite serves the sibling `data/` repo at `/data` (see vite.config.ts).
 */
export function loadGameData<T>(rel: string): Promise<T> {
  const cleaned = rel.replace(/^\/+/, "").replace(/^data\//, "");
  const base = getDataBaseUrl();
  // Prod: <VITE_DATA_BASE_URL>/<path>. Dev: /data/<path> (proxied).
  const url = base ? `${base}/${cleaned}` : `/data/${cleaned}`;
  return fetchYaml<T>(`${url}?build=${__BUILD_GIT_COMMIT__}`);
}
