import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { parse } from "yaml";
import { getStaticBaseUrl, getDataBaseUrl } from "@/lib/url";

export type LanguageCode = "en-US" | "zh-CN" | "zh-TW" | "ko-KR";
export const SUPPORTED_LANGUAGES: LanguageCode[] = ["en-US", "zh-CN", "zh-TW", "ko-KR"];

const base = getStaticBaseUrl();
const dataBase = getDataBaseUrl();

/**
 * GENERATED game-data namespaces are served as JSON from the `data/` repo
 * (`data/locales/<lng>/<ns>.json`); HAND-AUTHORED app-UI namespaces (`common`,
 * `items/*`, …) stay as `.yaml` in the app's own `public/locales`.
 * `<ns>` may be nested, e.g. `markers/World_L_A`.
 */
const GAME_DATA_NS = ["maps", "types"];
function isGameDataNs(ns: string): boolean {
  return (
    GAME_DATA_NS.includes(ns) ||
    ns.startsWith("markers/") ||
    ns.startsWith("regions/") ||
    ns.startsWith("wiki/")
  );
}

function localeLoadPath(lngs: string[], nss: string[]): string {
  const lng = lngs[0];
  const ns = nss[0];
  const q = `build=${__BUILD_GIT_COMMIT__}`;
  // Generated game data → JSON from the data repo.
  if (isGameDataNs(ns)) {
    const root = dataBase ? `${dataBase}/locales` : `/data/locales`;
    return `${root}/${lng}/${ns}.json?${q}`;
  }
  // Hand-authored app-UI strings → YAML in public/locales.
  return `${base}/locales/${lng}/${ns}.yaml?${q}`;
}

const LEGACY_TAGS: Record<string, string> = { en: "en-US" };
try {
  const stored = localStorage.getItem("i18nextLng");
  if (stored && LEGACY_TAGS[stored]) localStorage.setItem("i18nextLng", LEGACY_TAGS[stored]);
} catch {
  /* SSR/no storage */
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "zh-CN",
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ["common", "maps", "types"],
    defaultNS: "common",
    detection: { order: ["querystring", "localStorage", "navigator", "htmlTag"], caches: ["localStorage"] },
    backend: {
      loadPath: localeLoadPath,
      // YAML is a superset of JSON, so `yaml.parse` safely handles both the
      // `.json` game-data namespaces and the `.yaml` app-UI namespaces.
      parse: (data: string) => parse(data),
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
