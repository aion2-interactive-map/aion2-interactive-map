import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { parse } from "yaml";
import { getStaticBaseUrl, getDataBaseUrl } from "@/lib/url";

export type LanguageCode = "en" | "zh-CN" | "zh-TW";
export const SUPPORTED_LANGUAGES: LanguageCode[] = ["en", "zh-CN", "zh-TW"];

const base = getStaticBaseUrl();
const dataBase = getDataBaseUrl();

/**
 * Game-data namespaces are served from the `data/` repo
 * (`data/locales/<lng>/<ns>.yaml`); app-UI namespaces (`common`, …) stay in
 * the app's own `public/locales`. `<ns>` may be nested, e.g. `markers/World_L_A`.
 */
const GAME_DATA_NS = ["maps", "types"];
function isGameDataNs(ns: string): boolean {
  return (
    GAME_DATA_NS.includes(ns) ||
    ns.startsWith("markers/") ||
    ns.startsWith("regions/")
  );
}

function localeLoadPath(lngs: string[], nss: string[]): string {
  const lng = lngs[0];
  const ns = nss[0];
  const q = `build=${__BUILD_GIT_COMMIT__}`;
  if (isGameDataNs(ns)) {
    const root = dataBase ? `${dataBase}/locales` : `/data/locales`;
    return `${root}/${lng}/${ns}.yaml?${q}`;
  }
  return `${base}/locales/${lng}/${ns}.yaml?${q}`;
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
      parse: (data: string) => parse(data),
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
