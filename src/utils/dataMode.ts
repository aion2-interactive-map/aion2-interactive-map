// src/utils/dataMode.ts
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

export function computeBaseUrl(mode: DataMode): string {
  if (mode === "static") {
    return getStaticBaseUrl();
  }

  // Dynamic mode
  if (import.meta.env.DEV) {
    // Running on Vite dev server
    return "http://localhost:9000/api/v1/export";
  }

  // Production build OR GitHub Pages
  if (import.meta.env.PROD) {
    return "/api/v1/export";
  }

  // Fallback (should never happen)
  return "/api/v1/export";
}

export function getBackendLoadPath(mode: DataMode = DEFAULT_DATA_MODE) {
  const base = computeBaseUrl(mode);
  const staticBase = getStaticBaseUrl();

  return (lngs: string[], nss: string[]) => {
    const lng = lngs[0];
    const ns = nss[0];

    if (ns === "common") {
      return `${staticBase}/locales/${lng}/${ns}.yaml?build=${__BUILD_GIT_COMMIT__}`;
    } else if (ns === "regions") {
      return "";
    }

    return `${base}/locales/${lng}/${ns}.yaml?build=${__BUILD_GIT_COMMIT__}`;
  };
}
