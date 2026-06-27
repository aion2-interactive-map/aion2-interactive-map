export function getStaticBaseUrl() {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
}

/**
 * Base URL for the `resource` repo (game UI/Map webp assets, served under `UI/`).
 * - Prod: set `VITE_RESOURCE_BASE_URL` (e.g. a CDN host serving the resource repo).
 * - Dev: leave empty; Vite proxies `/UI` to the local `resource` repo
 *   (see `vite.config.ts`).
 */
export function getResourceBaseUrl() {
  return (import.meta.env.VITE_RESOURCE_BASE_URL ?? "").replace(/\/+$/, "");
}

/**
 * Base URL for the `data` repo (parsed game dataset: maps/types/markers/
 * regions + game-data locales).
 * - Prod: set `VITE_DATA_BASE_URL` (e.g. a CDN host serving the data repo).
 * - Dev: leave empty; Vite serves the sibling `data/` repo at `/data`
 *   (see `vite.config.ts`).
 */
export function getDataBaseUrl() {
  return (import.meta.env.VITE_DATA_BASE_URL ?? "").replace(/\/+$/, "");
}

export function getStaticUrl(relPath: string) {
  const clean = relPath.replace(/^\/+/, "");
  // Game resource assets live in the `resource` repo under `UI/`.
  if (clean.startsWith("UI/")) {
    const resourceBase = getResourceBaseUrl();
    if (resourceBase) {
      return `${resourceBase}/${clean}`;
    }
    // Dev: served by the Vite `/UI` proxy at the site root.
    return `/${clean}`;
  }
  const base = getStaticBaseUrl();
  return `${base}/${clean}`;
}

export function parseIconUrl(
  icon: string,
  map: { type: string },
): string {
  if (!icon) {
    icon = "UI/Resource/Texture/Icon/UT_Marker_Exploration_Hideen.webp";
  }
  if (icon.includes("Light") && map.type === "dark") {
    icon = icon.replace("Light", "Dark");
  }
  return getStaticUrl(icon);
}

export function getQueryParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function setQueryParam(key: string, value: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, "", url);
}
