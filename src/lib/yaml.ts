import { parse } from "yaml";
import { getStaticBaseUrl } from "@/lib/url";

export async function fetchYaml<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  return parse(await res.text()) as T;
}

/** Load a file from the local parsed-data root (public/). `rel` e.g. "data/maps.yaml". */
export function loadGameData<T>(rel: string): Promise<T> {
  const base = getStaticBaseUrl();
  const cleaned = rel.replace(/^\/+/, "");
  return fetchYaml<T>(`${base}/${cleaned}?build=${__BUILD_GIT_COMMIT__}`);
}
