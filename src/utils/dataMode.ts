// src/utils/dataMode.ts
import {getApiUrl} from "@/utils/url.ts";

export type DataMode = "static" | "dynamic";

function normalize(mode: string | undefined): DataMode {
  return mode === "dynamic" ? "dynamic" : "static";
}

export const DEFAULT_DATA_MODE: DataMode = normalize(
  import.meta.env.VITE_DEFAULT_DATA_MODE
);

// --- helpers shared by i18n & useDataMode ---

export function getStaticBaseUrl() {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
}

export function computeBaseUrl(): string {
  // Dynamic mode
  if (import.meta.env.DEV) {
    // Running on Vite dev server
    return "http://localhost:9000/api/v1";
  }

  // Production build OR GitHub Pages
  if (import.meta.env.PROD) {
    return getApiUrl("/api/v1");
  }

  // Fallback (should never happen)
  return "/api/v1";
}

export function computeExportBaseUrl(mode: DataMode): string {
  if (mode === "static") {
    return getStaticBaseUrl();
  }
  return computeBaseUrl() + "/export";
}

export function getBackendLoadPath(mode: DataMode = DEFAULT_DATA_MODE) {
  const base = computeExportBaseUrl(mode);
  const staticBase = getStaticBaseUrl();

  return (lngs: string[], nss: string[]) => {
    const lng = lngs[0];
    const ns = nss[0];

    if (ns === "regions" || ns === "servers") {
      return "";
    }
    if (ns.startsWith("markers") || ns.startsWith("regions") || ns === "maps" || ns === "types") {
      return `${base}/locales/${lng}/${ns}.yaml?build=${__BUILD_GIT_COMMIT__}`;
    }
    return `${staticBase}/locales/${lng}/${ns}.yaml?build=${__BUILD_GIT_COMMIT__}`;
  };
}
