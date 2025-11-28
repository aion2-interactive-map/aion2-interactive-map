// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { parse } from "yaml";
import { getBackendLoadPath } from "@/utils/dataMode"; // <-- changed

// ---- Language config --------------------------------------

export type LanguageCode = "en" | "zh-CN" | "zh-TW";

export const SUPPORTED_LANGUAGES: LanguageCode[] = [
  "en",
  "zh-CN",
  "zh-TW",
];

// ---- i18n initialization -----------------------------------

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // lng: "zh-CN",
    fallbackLng: "zh-CN",
    supportedLngs: SUPPORTED_LANGUAGES,

    ns: ["common", "maps", "types", "regions"],
    defaultNS: "common",

    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },

    backend: {
      loadPath: getBackendLoadPath(),  // now from config/dataMode
      parse: (data: string) => parse(data),
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
