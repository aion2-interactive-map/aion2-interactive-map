import type {GameMapMeta} from "../types/game.ts";

export function getQueryParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

export function setQueryParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (value === null) {
    params.delete(key);
  } else {
    params.set(key, value);
  }

  // update URL without reloading the page
  window.history.replaceState({}, "", `${url.pathname}?${params.toString()}`);
}

// marker_images are stored in s3 (cdn)
const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || import.meta.env.BASE_URL;

// api endpoint (usually https://tc-imba.com/
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/";

//
// const


export function getStaticUrl(relPath: string): string {
  return CDN_BASE_URL + relPath.replace(/^\//, "");
}

export function parseIconUrl(icon: string, map: GameMapMeta) {
  if (!icon) {
    icon = "UI/Resource/Texture/Icon/UT_Marker_Exploration_Hideen.webp";
  }
  if (icon.includes("Light") && map.type === "dark") {
    icon = icon.replace("Light", "Dark");
  }
  return getStaticUrl(icon);
}
