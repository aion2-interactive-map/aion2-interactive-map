import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const LANGUAGES = ['en', 'zh-CN', 'zh-TW'] as const
export type Language = (typeof LANGUAGES)[number]

const resources = {
  en: {
    translation: {
      title: 'Palworld Map',
      categories: 'Markers',
      showAll: 'Show all',
      hideAll: 'Hide all',
      loadError: 'Failed to load map data',
      copyPosition: 'Copy position',
      noMapSelected: 'No map selected',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
    },
  },
  'zh-CN': {
    translation: {
      title: '帕鲁世界地图',
      categories: '标记',
      showAll: '全部显示',
      hideAll: '全部隐藏',
      loadError: '地图数据加载失败',
      copyPosition: '复制坐标',
      noMapSelected: '未选择地图',
      zoomIn: '放大',
      zoomOut: '缩小',
    },
  },
  'zh-TW': {
    translation: {
      title: '帕魯世界地圖',
      categories: '標記',
      showAll: '全部顯示',
      hideAll: '全部隱藏',
      loadError: '地圖資料載入失敗',
      copyPosition: '複製座標',
      noMapSelected: '未選擇地圖',
      zoomIn: '放大',
      zoomOut: '縮小',
    },
  },
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  supportedLngs: [...LANGUAGES],
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
