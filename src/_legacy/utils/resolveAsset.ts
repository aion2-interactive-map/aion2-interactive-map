// src/utils/resolveAsset.ts

/**
 * Resolve a relative image/file path using Vite's BASE_URL.
 * - Keeps absolute URLs intact (http://, https://)
 * - Correctly handles GitHub Pages deployments
 * - Strips any leading slashes for consistency
 */
export function resolveAsset(src: string): string {
  if (!src) return src;

  // absolute URLs → return untouched
  if (/^https?:\/\//i.test(src)) return src;

  const base = import.meta.env.BASE_URL ?? "/";

  // remove all leading slashes to avoid "//" in final URL
  const normalized = src.replace(/^\/+/, "");

  // base already ends with "/" (e.g. "/aion2-interactive-map/")
  return `${base}${normalized}`;
}

/**
 * Resolve multiple assets.
 */
export function resolveAssets(list: string[] | undefined): string[] {
  if (!list || !Array.isArray(list)) return [];
  return list.map((src) => resolveAsset(src));
}
