import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const LANGUAGES = ['en', 'zh-CN', 'zh-TW'] as const
export type Language = (typeof LANGUAGES)[number]

const resources = {
  en: { translation: { title: 'Palworld Map', categories: 'Markers', showAll: 'Show all', hideAll: 'Hide all' } },
  'zh-CN': { translation: { title: '帕鲁世界地图', categories: '标记', showAll: '全部显示', hideAll: '全部隐藏' } },
  'zh-TW': { translation: { title: '帕魯世界地圖', categories: '標記', showAll: '全部顯示', hideAll: '全部隱藏' } },
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  supportedLngs: [...LANGUAGES],
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
