// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { parse } from "yaml";
import {getBackendLoadPath} from "./hooks/useDataMode.tsx";

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
    lng: "zh-CN",
    fallbackLng: "zh-CN",
    supportedLngs: SUPPORTED_LANGUAGES,

    ns: ["common", "maps", "types"],
    defaultNS: "common",

    backend: {
      loadPath: getBackendLoadPath(),
      parse: (data: string) => parse(data),
    },

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;