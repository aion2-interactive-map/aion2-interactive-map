import { getDataBaseUrl } from "@/lib/url";

/**
 * Load a generated-game-dataset file from the `data/` repo (JSON).
 * `rel` is e.g. "data/maps.json" or "data/markers/World_L_A.json".
 * - Prod: `VITE_DATA_BASE_URL` host (the leading `data/` is the on-host path).
 * - Dev: Vite serves the sibling `data/` repo at `/data` (see vite.config.ts).
 */
export function loadGameData<T>(rel: string): Promise<T> {
  const cleaned = rel.replace(/^\/+/, "").replace(/^data\//, "");
  const base = getDataBaseUrl();
  // Prod: <VITE_DATA_BASE_URL>/<path>. Dev: /data/<path> (proxied).
  const url = base ? `${base}/${cleaned}` : `/data/${cleaned}`;
  return fetch(`${url}?build=${__BUILD_GIT_COMMIT__}`).then((res) => {
    if (!res.ok)
      throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  });
}
