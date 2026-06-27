export function getStaticBaseUrl() {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
}
export function getStaticUrl(relPath: string) {
  const base = getStaticBaseUrl();
  return `${base}/${relPath.replace(/^\/+/, "")}`;
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
