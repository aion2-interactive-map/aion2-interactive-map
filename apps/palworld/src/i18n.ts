import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const LANGUAGES = ['en-US', 'de-DE', 'es-ES', 'es-MX', 'fr-FR', 'id-ID', 'it-IT', 'ko-KR', 'pl-PL', 'pt-BR', 'ru-RU', 'th-TH', 'tr-TR', 'vi-VN', 'zh-CN', 'zh-TW'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<Language, string> = {
  'en-US': 'English',
  'de-DE': 'Deutsch',
  'es-ES': 'Español',
  'es-MX': 'Español (México)',
  'fr-FR': 'Français',
  'id-ID': 'Bahasa Indonesia',
  'it-IT': 'Italiano',
  'ko-KR': '한국어',
  'pl-PL': 'Polski',
  'pt-BR': 'Português (Brasil)',
  'ru-RU': 'Русский',
  'th-TH': 'ไทย',
  'tr-TR': 'Türkçe',
  'vi-VN': 'Tiếng Việt',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
}

const resources = {
  'en-US': {
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
  'de-DE': {
    translation: {
      title: 'Palworld-Karte',
      categories: 'Markierungen',
      showAll: 'Alle anzeigen',
      hideAll: 'Alle ausblenden',
      loadError: 'Kartendaten konnten nicht geladen werden',
      copyPosition: 'Position kopieren',
      noMapSelected: 'Keine Karte ausgewählt',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
    },
  },
  'es-ES': {
    translation: {
      title: 'Mapa de Palworld',
      categories: 'Marcadores',
      showAll: 'Mostrar todo',
      hideAll: 'Ocultar todo',
      loadError: 'No se pudieron cargar los datos del mapa',
      copyPosition: 'Copiar posición',
      noMapSelected: 'Ningún mapa seleccionado',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
    },
  },
  'es-MX': {
    translation: {
      title: 'Mapa de Palworld',
      categories: 'Marcadores',
      showAll: 'Mostrar todo',
      hideAll: 'Ocultar todo',
      loadError: 'No se pudieron cargar los datos del mapa',
      copyPosition: 'Copiar posición',
      noMapSelected: 'Ningún mapa seleccionado',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
    },
  },
  'fr-FR': {
    translation: {
      title: 'Carte de Palworld',
      categories: 'Marqueurs',
      showAll: 'Tout afficher',
      hideAll: 'Tout masquer',
      loadError: 'Échec du chargement des données de la carte',
      copyPosition: 'Copier la position',
      noMapSelected: 'Aucune carte sélectionnée',
      zoomIn: 'Zoom avant',
      zoomOut: 'Zoom arrière',
    },
  },
  'id-ID': {
    translation: {
      title: 'Peta Palworld',
      categories: 'Penanda',
      showAll: 'Tampilkan semua',
      hideAll: 'Sembunyikan semua',
      loadError: 'Gagal memuat data peta',
      copyPosition: 'Salin posisi',
      noMapSelected: 'Tidak ada peta yang dipilih',
      zoomIn: 'Perbesar',
      zoomOut: 'Perkecil',
    },
  },
  'it-IT': {
    translation: {
      title: 'Mappa di Palworld',
      categories: 'Marcatori',
      showAll: 'Mostra tutto',
      hideAll: 'Nascondi tutto',
      loadError: 'Impossibile caricare i dati della mappa',
      copyPosition: 'Copia posizione',
      noMapSelected: 'Nessuna mappa selezionata',
      zoomIn: 'Ingrandisci',
      zoomOut: 'Riduci',
    },
  },
  'ko-KR': {
    translation: {
      title: '팰월드 지도',
      categories: '마커',
      showAll: '모두 표시',
      hideAll: '모두 숨기기',
      loadError: '지도 데이터를 불러오지 못했습니다',
      copyPosition: '좌표 복사',
      noMapSelected: '선택된 지도가 없습니다',
      zoomIn: '확대',
      zoomOut: '축소',
    },
  },
  'pl-PL': {
    translation: {
      title: 'Mapa Palworld',
      categories: 'Znaczniki',
      showAll: 'Pokaż wszystko',
      hideAll: 'Ukryj wszystko',
      loadError: 'Nie udało się wczytać danych mapy',
      copyPosition: 'Kopiuj pozycję',
      noMapSelected: 'Nie wybrano mapy',
      zoomIn: 'Przybliż',
      zoomOut: 'Oddal',
    },
  },
  'pt-BR': {
    translation: {
      title: 'Mapa de Palworld',
      categories: 'Marcadores',
      showAll: 'Mostrar tudo',
      hideAll: 'Ocultar tudo',
      loadError: 'Falha ao carregar os dados do mapa',
      copyPosition: 'Copiar posição',
      noMapSelected: 'Nenhum mapa selecionado',
      zoomIn: 'Aproximar',
      zoomOut: 'Afastar',
    },
  },
  'ru-RU': {
    translation: {
      title: 'Карта Palworld',
      categories: 'Метки',
      showAll: 'Показать все',
      hideAll: 'Скрыть все',
      loadError: 'Не удалось загрузить данные карты',
      copyPosition: 'Копировать координаты',
      noMapSelected: 'Карта не выбрана',
      zoomIn: 'Приблизить',
      zoomOut: 'Отдалить',
    },
  },
  'th-TH': {
    translation: {
      title: 'แผนที่ Palworld',
      categories: 'มาร์กเกอร์',
      showAll: 'แสดงทั้งหมด',
      hideAll: 'ซ่อนทั้งหมด',
      loadError: 'โหลดข้อมูลแผนที่ไม่สำเร็จ',
      copyPosition: 'คัดลอกตำแหน่ง',
      noMapSelected: 'ยังไม่ได้เลือกแผนที่',
      zoomIn: 'ซูมเข้า',
      zoomOut: 'ซูมออก',
    },
  },
  'tr-TR': {
    translation: {
      title: 'Palworld Haritası',
      categories: 'İşaretçiler',
      showAll: 'Tümünü göster',
      hideAll: 'Tümünü gizle',
      loadError: 'Harita verileri yüklenemedi',
      copyPosition: 'Konumu kopyala',
      noMapSelected: 'Harita seçilmedi',
      zoomIn: 'Yakınlaştır',
      zoomOut: 'Uzaklaştır',
    },
  },
  'vi-VN': {
    translation: {
      title: 'Bản đồ Palworld',
      categories: 'Điểm đánh dấu',
      showAll: 'Hiện tất cả',
      hideAll: 'Ẩn tất cả',
      loadError: 'Không tải được dữ liệu bản đồ',
      copyPosition: 'Sao chép vị trí',
      noMapSelected: 'Chưa chọn bản đồ',
      zoomIn: 'Phóng to',
      zoomOut: 'Thu nhỏ',
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

const LEGACY_TAGS: Record<string, string> = { en: 'en-US' }
try {
  const stored = localStorage.getItem('i18nextLng')
  if (stored && LEGACY_TAGS[stored]) localStorage.setItem('i18nextLng', LEGACY_TAGS[stored])
} catch { /* SSR/no storage */ }

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  supportedLngs: [...LANGUAGES],
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
})

export default i18n
