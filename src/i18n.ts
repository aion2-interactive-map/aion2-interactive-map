import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { parse } from "yaml";
import { getStaticBaseUrl } from "@/lib/url";

export type LanguageCode = "en" | "zh-CN" | "zh-TW";
export const SUPPORTED_LANGUAGES: LanguageCode[] = ["en", "zh-CN", "zh-TW"];

const base = getStaticBaseUrl();

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
      loadPath: `${base}/locales/{{lng}}/{{ns}}.yaml?build=${__BUILD_GIT_COMMIT__}`,
      parse: (data: string) => parse(data),
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
