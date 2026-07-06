# Unified BCP 47 Language Tags Implementation Plan

> **For agentic workers:** Implementation is delegated to Codex per workspace convention
> (Claude plans/designs, Codex codes, Claude authors translations and reviews/verifies).
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all language tags across the platform to IETF BCP 47 (ISO 639-1 + ISO 3166-1,
e.g. `en-US`, `zh-CN`, `ko-KR`); emit all 16 Palworld L10N languages in the palworld app;
add `ko-KR` to the aion2 app (and rename its `en` → `en-US`).

**Architecture:** Two independent parts. Part A (Palworld): the extractor
(`tools/.claude/worktrees/palworld-extractor/palworld/`) reads per-language
`DT_PalNameText_Common.json` from the game's `L10N/` export (folder names normalized to
BCP 47), emits per-language marker locales, and `data_src/types.yaml` grows hand-authored
taxonomy labels for all 16 languages; the palworld frontend app gets 16-language UI strings.
Part B (AION2): the Python tools gain a `ko()` L10N resolver, plumb `name_ko` through
parse → emit, rename the `en` locale to `en-US` everywhere (tools, data repo, frontend,
e2e), and the aion2 app gets hand-authored ko-KR UI YAML files.

**Tech Stack:** Node (palworld extractor), Python/uv (aion2 tools), React 19 + i18next
(both apps), Playwright e2e.

---

## Canonical tag mapping

Palworld `L10N/` folder → BCP 47 tag:

| folder | tag | folder | tag |
|---|---|---|---|
| `de` | `de-DE` | `pl` | `pl-PL` |
| `en` | `en-US` | `pt-BR` | `pt-BR` |
| `es` | `es-ES` | `ru` | `ru-RU` |
| `es-MX` | `es-MX` | `th` | `th-TH` |
| `fr` | `fr-FR` | `tr` | `tr-TR` |
| `id` | `id-ID` | `vi` | `vi-VN` |
| `it` | `it-IT` | `zh-Hans` | `zh-CN` |
| `ko` | `ko-KR` | `zh-Hant` | `zh-TW` |

AION2 raw L10N folders are already `en-US` / `ko-KR` / `zh-TW`; the emitted/served tag set
becomes `en-US`, `zh-CN`, `zh-TW`, `ko-KR` (`zh-CN` derived from `zh-TW` via OpenCC as today).

Both apps keep i18next detection; add a one-time localStorage migration so users with a
stored legacy tag (`en`) are mapped to the new tag (`en-US`) instead of falling back.

---

# Part A — Palworld: all 16 L10N languages

Branches: extractor work on `worktree-palworld-extractor` (existing tools worktree at
`E:\aion2-map\tools\.claude\worktrees\palworld-extractor`), frontend work on
`worktree-multi-game-map-platform` (current `E:\aion2-map\frontend` checkout).
`data-palworld` is a regenerated artifact repo (commit after regen).

### Task A1: Extractor — read L10N pal names per language

**Files:**
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/src/extract.mjs`
- Test: `tools/.claude/worktrees/palworld-extractor/palworld/test/extract.test.mjs`

- [ ] Add the folder→tag map and L10N reader. `RAW` points at `…/Content/Pal`; the L10N
  root is its sibling `…/Content/L10N`:

```js
export const L10N_LANG_TAGS = {
  de: 'de-DE', en: 'en-US', es: 'es-ES', 'es-MX': 'es-MX', fr: 'fr-FR',
  id: 'id-ID', it: 'it-IT', ko: 'ko-KR', pl: 'pl-PL', 'pt-BR': 'pt-BR',
  ru: 'ru-RU', th: 'th-TH', tr: 'tr-TR', vi: 'vi-VN',
  'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW',
};
```

- In `runExtract(raw)`, replace the single `names` build with per-language names read from
  `path.join(raw, '..', 'L10N', folder, 'Pal/DataTable/Text/DT_PalNameText_Common.json')`
  for every folder in `L10N_LANG_TAGS` (same `[0].Rows` / `PAL_NAME_*` /
  `r.TextData.SourceString` shape as the base table — verified: L10N tables carry the
  localized text in both `SourceString` and `LocalizedString`).
- Parsed output shape: `namesByLang: { [tag]: { [palId]: string } }` (drop the old flat
  `names`). `writeParsed`/`readParsed` need no special handling (plain object).
- If a language folder or its table is missing, **fail loudly** (throw) — the L10N set is a
  fixed input; silent partial output is worse.
- [ ] Update/extend the vitest tests to cover: tag mapping table completeness (16 entries),
  and a `namesByLang` fixture assertion (e.g. `namesByLang['ko-KR'].Alpaca === '멜파카'`
  style, using a small synthetic fixture rather than the real export if the tests are
  fixture-based — follow the existing test style in `test/extract.test.mjs`).
- [ ] Run `npm test` in the extractor dir; expect pass.
- [ ] Commit (tools worktree): `feat(palworld): read per-language pal names from L10N`

### Task A2: Extractor — per-language locale emission

**Files:**
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/src/emit.mjs`
- Modify: `tools/.claude/worktrees/palworld-extractor/palworld/data_src/types.yaml` (Task A3 content)
- Test: extractor test suite

- [ ] In `buildDataset`:
  - `languages` come from `src.languages` in types.yaml (now the 16 tags; keep reading from
    YAML so the two stay in sync). Validate `src.languages` ⊆ keys of `parsed.namesByLang`.
  - Boss and palSpawn candidates currently bake one `name`/`description` string; make them
    per-language: candidate gets `nameByLng` / `descByLng` objects
    (`nameByLng[lng] = \`${palName(namesByLang[lng], b.characterId)} Lv.${b.level}\``, and
    for spawns the same `join(' / ')` / `Lv.${lvMin}–${lvMax}` composition per language).
    `sortKey` logic is unchanged (ids/coords, not names).
  - `markerLoc` becomes per-language: `markerLoc[lng][mapId][markerId] = {name?, description?}`;
    `locales[lng].markers = markerLoc[lng]`.
- [ ] `runEmit` loop is unchanged structurally (it already iterates `ds.locales`); confirm it
  writes `locales/<tag>/…` for all 16 tags.
- [ ] Update emit tests for the new per-language shape (e.g. boss marker name differs
  between `en-US` and `ko-KR` in a fixture).
- [ ] Run `npm test`; expect pass.
- [ ] Commit: `feat(palworld): per-language marker locales for all 16 L10N languages`

### Task A3: types.yaml — 16-language taxonomy labels (content authored by Claude)

Replace `languages: [en, zh-CN, zh-TW]` with the 16 tags and use exactly this content for
names/shortNames (structure unchanged; `es-MX` intentionally mirrors `es-ES`):

```yaml
languages: [en-US, de-DE, es-ES, es-MX, fr-FR, id-ID, it-IT, ko-KR, pl-PL, pt-BR, ru-RU, th-TH, tr-TR, vi-VN, zh-CN, zh-TW]
maps:
  - id: MainWorld
    names: { en-US: Palpagos Islands, de-DE: Palpagos-Inseln, es-ES: Islas Palpagos, es-MX: Islas Palpagos, fr-FR: Îles Palpagos, id-ID: Kepulauan Palpagos, it-IT: Isole Palpagos, ko-KR: 팔파고스 제도, pl-PL: Wyspy Palpagos, pt-BR: Ilhas Palpagos, ru-RU: Острова Палпагос, th-TH: หมู่เกาะพัลปาโกส, tr-TR: Palpagos Adaları, vi-VN: Quần đảo Palpagos, zh-CN: 帕鲁帕格斯群岛, zh-TW: 帕魯帕格斯群島 }
    shortNames: { en-US: Main, de-DE: Haupt, es-ES: Principal, es-MX: Principal, fr-FR: Principale, id-ID: Utama, it-IT: Principale, ko-KR: 메인, pl-PL: Główna, pt-BR: Principal, ru-RU: Основной, th-TH: หลัก, tr-TR: Ana, vi-VN: Chính, zh-CN: 主大陆, zh-TW: 主大陸 }
  - id: WorldTree
    names: { en-US: Sakurajima & World Tree, de-DE: Sakurajima & Weltenbaum, es-ES: Sakurajima y Árbol del Mundo, es-MX: Sakurajima y Árbol del Mundo, fr-FR: Sakurajima et Arbre-Monde, id-ID: Sakurajima & Pohon Dunia, it-IT: Sakurajima e Albero del Mondo, ko-KR: 사쿠라지마 & 세계수, pl-PL: Sakurajima i Drzewo Świata, pt-BR: Sakurajima e Árvore do Mundo, ru-RU: Сакурадзима и Мировое древо, th-TH: ซากุระจิมะและต้นไม้โลก, tr-TR: Sakurajima ve Dünya Ağacı, vi-VN: Sakurajima & Cây Thế Giới, zh-CN: 樱花岛与世界树, zh-TW: 櫻花島與世界樹 }
    shortNames: { en-US: Sakurajima, de-DE: Sakurajima, es-ES: Sakurajima, es-MX: Sakurajima, fr-FR: Sakurajima, id-ID: Sakurajima, it-IT: Sakurajima, ko-KR: 사쿠라지마, pl-PL: Sakurajima, pt-BR: Sakurajima, ru-RU: Сакурадзима, th-TH: ซากุระจิมะ, tr-TR: Sakurajima, vi-VN: Sakurajima, zh-CN: 樱花岛, zh-TW: 櫻花島 }
categories:
  - id: location
    names: { en-US: Locations, de-DE: Orte, es-ES: Lugares, es-MX: Lugares, fr-FR: Lieux, id-ID: Lokasi, it-IT: Luoghi, ko-KR: 지역, pl-PL: Miejsca, pt-BR: Locais, ru-RU: Локации, th-TH: สถานที่, tr-TR: Konumlar, vi-VN: Địa điểm, zh-CN: 地点, zh-TW: 地點 }
  - id: boss
    names: { en-US: Bosses, de-DE: Bosse, es-ES: Jefes, es-MX: Jefes, fr-FR: Boss, id-ID: Bos, it-IT: Boss, ko-KR: 보스, pl-PL: Bossowie, pt-BR: Chefes, ru-RU: Боссы, th-TH: บอส, tr-TR: Boslar, vi-VN: Trùm, zh-CN: 首领, zh-TW: 首領 }
  - id: collectible
    names: { en-US: Collectibles, de-DE: Sammelobjekte, es-ES: Coleccionables, es-MX: Coleccionables, fr-FR: Objets à collectionner, id-ID: Koleksi, it-IT: Collezionabili, ko-KR: 수집품, pl-PL: Znajdźki, pt-BR: Colecionáveis, ru-RU: Коллекционные предметы, th-TH: ของสะสม, tr-TR: Koleksiyonluklar, vi-VN: Đồ sưu tầm, zh-CN: 收集品, zh-TW: 收集品 }
  - id: resource
    names: { en-US: Resources, de-DE: Ressourcen, es-ES: Recursos, es-MX: Recursos, fr-FR: Ressources, id-ID: Sumber Daya, it-IT: Risorse, ko-KR: 자원, pl-PL: Surowce, pt-BR: Recursos, ru-RU: Ресурсы, th-TH: ทรัพยากร, tr-TR: Kaynaklar, vi-VN: Tài nguyên, zh-CN: 资源, zh-TW: 資源 }
  - id: pal
    names: { en-US: Pals, de-DE: Pals, es-ES: Pals, es-MX: Pals, fr-FR: Pals, id-ID: Pal, it-IT: Pal, ko-KR: 팰, pl-PL: Pale, pt-BR: Pals, ru-RU: Палы, th-TH: พัล, tr-TR: Pal'lar, vi-VN: Pal, zh-CN: 帕鲁, zh-TW: 帕魯 }
subtypes:
  - id: fastTravel   # category/icon lines unchanged
    names: { en-US: Fast Travel Statue, de-DE: Schnellreise-Statue, es-ES: Estatua de viaje rápido, es-MX: Estatua de viaje rápido, fr-FR: Statue de voyage rapide, id-ID: Patung Perjalanan Cepat, it-IT: Statua del viaggio rapido, ko-KR: 빠른 이동 석상, pl-PL: Posąg szybkiej podróży, pt-BR: Estátua de viagem rápida, ru-RU: Статуя быстрого перемещения, th-TH: รูปปั้นเดินทางด่วน, tr-TR: Hızlı Seyahat Heykeli, vi-VN: Tượng dịch chuyển nhanh, zh-CN: 传送雕像, zh-TW: 傳送雕像 }
  - id: eagleStatue
    names: { en-US: Eagle Statue, de-DE: Adlerstatue, es-ES: Estatua del águila, es-MX: Estatua del águila, fr-FR: Statue de l'aigle, id-ID: Patung Elang, it-IT: Statua dell'aquila, ko-KR: 독수리 석상, pl-PL: Posąg orła, pt-BR: Estátua da águia, ru-RU: Статуя орла, th-TH: รูปปั้นนกอินทรี, tr-TR: Kartal Heykeli, vi-VN: Tượng đại bàng, zh-CN: 巨鹰雕像, zh-TW: 巨鷹雕像 }
  - id: dungeon
    names: { en-US: Dungeon, de-DE: Dungeon, es-ES: Mazmorra, es-MX: Mazmorra, fr-FR: Donjon, id-ID: Dungeon, it-IT: Dungeon, ko-KR: 던전, pl-PL: Loch, pt-BR: Masmorra, ru-RU: Подземелье, th-TH: ดันเจี้ยน, tr-TR: Zindan, vi-VN: Hầm ngục, zh-CN: 地下城, zh-TW: 地下城 }
  - id: fieldBoss
    names: { en-US: Field Boss, de-DE: Feldboss, es-ES: Jefe de campo, es-MX: Jefe de campo, fr-FR: Boss de zone, id-ID: Bos Lapangan, it-IT: Boss di zona, ko-KR: 필드 보스, pl-PL: Boss terenowy, pt-BR: Chefe de campo, ru-RU: Полевой босс, th-TH: บอสภาคสนาม, tr-TR: Saha Bosu, vi-VN: Boss dã ngoại, zh-CN: 野外首领, zh-TW: 野外首領 }
  - id: treasureMap
    names: { en-US: Treasure Map Point, de-DE: Schatzkarten-Fundort, es-ES: Punto del mapa del tesoro, es-MX: Punto del mapa del tesoro, fr-FR: Point de carte au trésor, id-ID: Titik Peta Harta Karun, it-IT: Punto della mappa del tesoro, ko-KR: 보물 지도 지점, pl-PL: Punkt mapy skarbów, pt-BR: Ponto do mapa do tesouro, ru-RU: Точка карты сокровищ, th-TH: จุดแผนที่สมบัติ, tr-TR: Hazine Haritası Noktası, vi-VN: Điểm bản đồ kho báu, zh-CN: 藏宝图地点, zh-TW: 藏寶圖地點 }
  - id: note
    names: { en-US: Note, de-DE: Notiz, es-ES: Nota, es-MX: Nota, fr-FR: Note, id-ID: Catatan, it-IT: Nota, ko-KR: 노트, pl-PL: Notatka, pt-BR: Nota, ru-RU: Записка, th-TH: บันทึก, tr-TR: Not, vi-VN: Ghi chú, zh-CN: 笔记, zh-TW: 筆記 }
  - id: copper
    names: { en-US: Copper Ore, de-DE: Kupfererz, es-ES: Mineral de cobre, es-MX: Mineral de cobre, fr-FR: Minerai de cuivre, id-ID: Bijih Tembaga, it-IT: Minerale di rame, ko-KR: 구리 광석, pl-PL: Ruda miedzi, pt-BR: Minério de cobre, ru-RU: Медная руда, th-TH: แร่ทองแดง, tr-TR: Bakır Cevheri, vi-VN: Quặng đồng, zh-CN: 铜矿, zh-TW: 銅礦 }
  - id: quartz
    names: { en-US: Quartz, de-DE: Quarz, es-ES: Cuarzo, es-MX: Cuarzo, fr-FR: Quartz, id-ID: Kuarsa, it-IT: Quarzo, ko-KR: 석영, pl-PL: Kwarc, pt-BR: Quartzo, ru-RU: Кварц, th-TH: ควอตซ์, tr-TR: Kuvars, vi-VN: Thạch anh, zh-CN: 石英, zh-TW: 石英 }
  - id: coal
    names: { en-US: Coal, de-DE: Kohle, es-ES: Carbón, es-MX: Carbón, fr-FR: Charbon, id-ID: Batu Bara, it-IT: Carbone, ko-KR: 석탄, pl-PL: Węgiel, pt-BR: Carvão, ru-RU: Уголь, th-TH: ถ่านหิน, tr-TR: Kömür, vi-VN: Than đá, zh-CN: 煤矿, zh-TW: 煤礦 }
  - id: sulfur
    names: { en-US: Sulfur, de-DE: Schwefel, es-ES: Azufre, es-MX: Azufre, fr-FR: Soufre, id-ID: Belerang, it-IT: Zolfo, ko-KR: 유황, pl-PL: Siarka, pt-BR: Enxofre, ru-RU: Сера, th-TH: กำมะถัน, tr-TR: Kükürt, vi-VN: Lưu huỳnh, zh-CN: 硫磺, zh-TW: 硫磺 }
  - id: palSpawn
    names: { en-US: Pal Spawn, de-DE: Pal-Vorkommen, es-ES: Aparición de Pal, es-MX: Aparición de Pal, fr-FR: Apparition de Pal, id-ID: Kemunculan Pal, it-IT: Comparsa di Pal, ko-KR: 팰 출현 지점, pl-PL: Miejsce występowania Pali, pt-BR: Surgimento de Pal, ru-RU: Место обитания пала, th-TH: จุดเกิดพัล, tr-TR: Pal Çıkma Noktası, vi-VN: Điểm xuất hiện Pal, zh-CN: 帕鲁出没点, zh-TW: 帕魯出沒點 }
```

- [ ] Commit with Task A2 (same change set) or separately: `feat(palworld): 16-language taxonomy labels`

### Task A4: Palworld app — 16-language UI

**Files:**
- Modify: `frontend/apps/palworld/src/i18n.ts`
- Modify: `frontend/apps/palworld/src/components/TopBar.tsx`
- Modify: `frontend/apps/palworld/src/App.tsx` (line 16: `?? 'en'` → `?? 'en-US'`)

- [ ] `LANGUAGES` = the 16 tags (same order as types.yaml). Add native-name labels:

```ts
export const LANGUAGE_LABELS: Record<Language, string> = {
  'de-DE': 'Deutsch', 'en-US': 'English', 'es-ES': 'Español',
  'es-MX': 'Español (México)', 'fr-FR': 'Français', 'id-ID': 'Bahasa Indonesia',
  'it-IT': 'Italiano', 'ko-KR': '한국어', 'pl-PL': 'Polski',
  'pt-BR': 'Português (Brasil)', 'ru-RU': 'Русский', 'th-TH': 'ไทย',
  'tr-TR': 'Türkçe', 'vi-VN': 'Tiếng Việt', 'zh-CN': '简体中文', 'zh-TW': '繁體中文',
}
```

- [ ] Resources: keep the existing `en`(→`en-US`), `zh-CN`, `zh-TW` translation objects and
  add the other 13 with these values (keys: title, categories, showAll, hideAll, loadError,
  copyPosition, noMapSelected, zoomIn, zoomOut):

| key | de-DE | es-ES / es-MX | fr-FR | id-ID | it-IT | ko-KR | pl-PL | pt-BR | ru-RU | th-TH | tr-TR | vi-VN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| title | Palworld-Karte | Mapa de Palworld | Carte de Palworld | Peta Palworld | Mappa di Palworld | 팰월드 지도 | Mapa Palworld | Mapa de Palworld | Карта Palworld | แผนที่ Palworld | Palworld Haritası | Bản đồ Palworld |
| categories | Markierungen | Marcadores | Marqueurs | Penanda | Marcatori | 마커 | Znaczniki | Marcadores | Метки | มาร์กเกอร์ | İşaretçiler | Điểm đánh dấu |
| showAll | Alle anzeigen | Mostrar todo | Tout afficher | Tampilkan semua | Mostra tutto | 모두 표시 | Pokaż wszystko | Mostrar tudo | Показать все | แสดงทั้งหมด | Tümünü göster | Hiện tất cả |
| hideAll | Alle ausblenden | Ocultar todo | Tout masquer | Sembunyikan semua | Nascondi tutto | 모두 숨기기 | Ukryj wszystko | Ocultar tudo | Скрыть все | ซ่อนทั้งหมด | Tümünü gizle | Ẩn tất cả |
| loadError | Kartendaten konnten nicht geladen werden | No se pudieron cargar los datos del mapa | Échec du chargement des données de la carte | Gagal memuat data peta | Impossibile caricare i dati della mappa | 지도 데이터를 불러오지 못했습니다 | Nie udało się wczytać danych mapy | Falha ao carregar os dados do mapa | Не удалось загрузить данные карты | โหลดข้อมูลแผนที่ไม่สำเร็จ | Harita verileri yüklenemedi | Không tải được dữ liệu bản đồ |
| copyPosition | Position kopieren | Copiar posición | Copier la position | Salin posisi | Copia posizione | 좌표 복사 | Kopiuj pozycję | Copiar posição | Копировать координаты | คัดลอกตำแหน่ง | Konumu kopyala | Sao chép vị trí |
| noMapSelected | Keine Karte ausgewählt | Ningún mapa seleccionado | Aucune carte sélectionnée | Tidak ada peta yang dipilih | Nessuna mappa selezionata | 선택된 지도가 없습니다 | Nie wybrano mapy | Nenhum mapa selecionado | Карта не выбрана | ยังไม่ได้เลือกแผนที่ | Harita seçilmedi | Chưa chọn bản đồ |
| zoomIn | Vergrößern | Acercar | Zoom avant | Perbesar | Ingrandisci | 확대 | Przybliż | Aproximar | Приблизить | ซูมเข้า | Yakınlaştır | Phóng to |
| zoomOut | Verkleinern | Alejar | Zoom arrière | Perkecil | Riduci | 축소 | Oddal | Afastar | Отдалить | ซูมออก | Uzaklaştır | Thu nhỏ |

- [ ] `fallbackLng: 'en-US'`; before `i18n.init`, migrate legacy stored tags:

```ts
const LEGACY_TAGS: Record<string, string> = { en: 'en-US' }
try {
  const stored = localStorage.getItem('i18nextLng')
  if (stored && LEGACY_TAGS[stored]) localStorage.setItem('i18nextLng', LEGACY_TAGS[stored])
} catch { /* SSR/no storage */ }
```

- [ ] TopBar `<option>` shows `LANGUAGE_LABELS[l]`.
- [ ] Run `pnpm --filter palworld exec tsc -b` (or the app's lint/build script) — no errors.
- [ ] Commit (frontend): `feat(palworld): 16-language UI + BCP 47 tags`

### Task A5: Regenerate data-palworld + verify

- [ ] In the extractor dir: `npm run extract && npm run emit` (RAW defaults to the Steam
  export path; parsed dir is regenerated because Task A1 changed its shape).
- [ ] Verify `E:\aion2-map\data-palworld\locales\` contains exactly the 16 tag dirs
  (`ls`); the stale `locales/en` dir must be **deleted** (emit doesn't clean).
- [ ] Spot-check: `locales/ko-KR/markers/MainWorld.json` boss names are Korean;
  `locales/de-DE/types.json` category names are German.
- [ ] Palworld e2e: `pnpm --filter palworld exec playwright test` — the existing smoke
  suite passes; add/extend a case switching the language select to `ko-KR` and asserting a
  Korean sidebar label (팰 or 마커).
- [ ] Commit `data-palworld` (artifact repo): `data: regenerate with 16 BCP 47 locales`

---

# Part B — AION2: `en` → `en-US` + add `ko-KR`

Branch: create `feat/lang-tags-ko` **directly in the main tools checkout**
(`E:\aion2-map\tools`, currently on clean `master`) — the emit pipeline resolves the `data/`
and `frontend/` sibling repos relative to the main-checkout layout, so a nested worktree
cannot run the pipeline. Frontend work stays on `worktree-multi-game-map-platform`.
`data/` is a regenerated artifact repo.

### Task B1: tools — `ko()` L10N resolver

**Files:** Modify `tools/aion2/tools/maps/l10n.py`

- [ ] Load `ko-KR/L10NString.json` alongside en/tw; add:

```python
self._ko = json.loads((_L10N_DIR / "ko-KR" / "L10NString.json").read_text(encoding="utf-8"))["Entries"]

def ko(self, key: str) -> str:
    return self._lookup(self._ko, key)
```

- [ ] Commit: `feat(aion2): ko-KR L10N resolver`

### Task B2: tools — plumb `name_ko` through parse

**Files:** Modify `tools/aion2/tools/maps/extract.py` (and any helper it uses for names)

- [ ] Every site that emits `name_en`/`name_zhCN` (subzones, world markers, monolith
  groups' `title_en`/`title_zhCN`, `map_title()` return `{en, zhCN}`) also emits the ko
  variant (`name_ko` / `title_ko` / `"ko"` key) via `l10n.ko(key)` on the same L10N key.
  Sweep with `grep -n "name_zhCN\|title_zhCN\|zhCN" tools/aion2/tools/maps/extract.py`.
- [ ] Boss names come from `NpcData.Desc` — confirm how en/zh are resolved there and apply
  the same source for ko (same key, `l10n.ko`).
- [ ] Re-run the parse for all maps (see extract.py docstring for the exact command, e.g.
  `uv run python -m aion2.tools.maps.extract`) with `RAW_DATA_PATH=E:/Exports/AION2/Content`.
- [ ] Verify: `python - <<'EOF'` check that `parsed_data/maps/World_L_A.json` subzone 0 has a
  non-empty `name_ko` (한국어) and WorldMarkers entries carry `name_ko`.
- [ ] Run `uv run pytest tests` in tools; fix any parse-shape assertions.
- [ ] Commit: `feat(aion2): parse name_ko from L10N`

### Task B3: tools — emit with `en-US` + `ko-KR`

**Files:** Modify `tools/aion2/tools/maps/emit_frontend.py`

- [ ] `LANGS = ("en-US", "zh-CN", "zh-TW", "ko-KR")`.
- [ ] `_locale_block`: rename the `"en"` branch to `"en-US"`; add a `"ko-KR"` branch:
  `name = v.get("name_ko") or v.get("name_en", "")`, `desc = v.get("desc_ko") or v.get("desc_en")`,
  short via `short_ko` falling back to `short_en`.
- [ ] `_types_locale` `_pick`: `"en-US"` → `names["en"]` key inside curated dicts stays
  `en` (internal dict keys unchanged); add `"ko-KR"` → `names.get("ko") or names["en"]`.
  (Curated YAML dir lookup `CURATED_LOCALES / lang / "types.yaml"` now resolves `en-US` /
  `ko-KR` dirs — Task B5 renames/creates them.)
- [ ] `_map_display`: add `name_ko`/`short_ko` from `map_title(...)["ko"]`;
  `_FACTION_SUFFIX` gains `"ko": " (천족)"` (light) / `" (마족)"` (dark) — keyed however the
  dict is laid out (add a `ko` entry per faction next to `en`/`zh-CN`).
- [ ] Fragments/hiddenCube/creature locale entries in `build_markers` gain `name_ko`/`desc_ko`
  (`desc_ko` for creatures: `f"{cnt}곳의 리젠 지점"`; fragments/hiddenCube `#n` forms reuse the
  en format).
- [ ] `EXTRA_SUBTYPE_NAMES` and `GATHER_SUBTYPE_NAMES`: add `"ko"` values **derived from the
  official ko-KR L10N**. Write a one-off script `tools/aion2/tools/maps/derive_ko_names.py`:
  for each dict entry, exact-match the `en` value against all values of
  `en-US/L10NString.json`; collect the keys; read the same keys from `ko-KR/L10NString.json`;
  if all found ko values agree, print `key: ko_value`; else print candidates for manual pick.
  Paste results into the dicts (Claude reviews the mapping before paste). Entries with no
  match keep no `ko` key and fall back to `en` via `_pick`/`_locale_block` fallbacks.
- [ ] Also sweep `tools/aion2/tools/wiki/emit_wiki.py`:
  - `LANGS = ("en-US", "zh-CN", "zh-TW", "ko-KR")`; the lng→LText-key map at ~line 524
    becomes `{"en-US": "en", "zh-CN": "zhCN", "zh-TW": "zhTW", "ko-KR": "ko"}`.
  - `_lt()` (~line 40) returns `{"en", "zhCN", "zhTW", "ko"}` with ko from `l10n.ko(key)`
    (or the module's own ko table load, matching how it loads en/tw).
  - Fallback rule: empty ko → fall back to en at emit time (mirror existing zh fallbacks).
- [ ] Update `tools/aion2/tests/test_generated_maps_data.py` expectations (`en`→`en-US`,
  add `ko-KR` where language sets are asserted).
- [ ] `uv run pytest tests` — pass.
- [ ] Commit: `feat(aion2): emit en-US/ko-KR locales (BCP 47)`

### Task B4: aion2 frontend — tags, wiki LText, e2e

**Files:**
- Modify: `frontend/apps/aion2/src/i18n.ts`
- Modify: `frontend/apps/aion2/src/lib/wiki.ts` (lt), `frontend/apps/aion2/src/types/wiki.ts` (LText type)
- Modify: `frontend/apps/aion2/e2e/*.spec.ts`
- Sweep: `grep -rn "\"en\"\|'en'\|lng=en" apps/aion2/src apps/aion2/e2e apps/aion2/index.html apps/aion2/vite.config.ts`

- [ ] `i18n.ts`: `LanguageCode`/`SUPPORTED_LANGUAGES` = `["en-US", "zh-CN", "zh-TW", "ko-KR"]`;
  keep `fallbackLng: "zh-CN"`; add the same legacy-localStorage migration snippet as Task A4
  (`{ en: 'en-US' }`).
- [ ] `wiki.ts` `lt()`:

```ts
if (lang.startsWith("ko")) return text.ko || text.en || text.zhCN;
```

  before the zh branches; `LText` type gains `ko?: string`.
- [ ] e2e specs: every `lng=en` → `lng=en-US`; `screenshots.spec.ts` `LANGS` →
  `["en-US", "zh-CN"]`. `lang-zh-CN` test ids unchanged.
- [ ] Commit: `feat(aion2): en-US/ko-KR language tags in app + e2e`

### Task B5: aion2 frontend — locale files (ko content authored by Claude)

**Files:**
- Rename: `frontend/apps/aion2/public/locales/en/` → `public/locales/en-US/` (git mv, all files)
- Create: `public/locales/ko-KR/common.yaml`, `ko-KR/wiki.yaml`, `ko-KR/types.yaml`
  (full Korean translations of the en-US files — authored by Claude, not Codex; game terms
  follow official AION2 Korean: Elyos=천족, Asmodian=마족, Abyss=어비스, Kibelisk=키벨리스크)
- Modify: `language:` block in **all four** `common.yaml` files:

```yaml
language:
  label: "Language"        # localized per file
  en-US: "English"
  zh-CN: "简体中文"          # value per file's language (translated names as today)
  zh-TW: "繁體中文"
  ko-KR: "한국어"
```

  (key rename `en` → `en-US`, new `ko-KR` key; keep each file's translated display names —
  today's files translate the names, so follow the file's own language.)
- [ ] Check the `lang:` header field in common.yaml (`lang: "en"` → `lang: "en-US"`, add
  `lang: "ko-KR"`), and grep for consumers of that key.
- [ ] Commit: `feat(aion2): ko-KR locale files, en → en-US`

### Task B6: regenerate `data/` + verify end-to-end

- [ ] From the main tools checkout (`E:\aion2-map\tools`, after merging the frontend
  `public/locales` rename back — the emit reads `CURATED_LOCALES` from the frontend repo;
  per workspace convention merge with rebase before live testing):
  `RAW_DATA_PATH=E:/Exports/AION2/Content uv run python -m aion2.tools.maps.emit_frontend`
  and the wiki emit (see emit_wiki.py docstring for the command).
- [ ] Delete the stale `data/locales/en/` dir; verify `data/locales/` = `en-US`, `zh-CN`,
  `zh-TW`, `ko-KR` and each contains maps/types/markers/regions (+ wiki namespaces).
- [ ] Spot-check `data/locales/ko-KR/maps.json`: map titles Korean with `(천족)`/`(마족)`
  suffixes; `data/locales/ko-KR/markers/World_L_A.json` names Korean.
- [ ] Frontend e2e: `pnpm --filter aion2 exec playwright test e2e/smoke.spec.ts e2e/wiki.spec.ts`
  (note: `wiki.spec.ts:20` has a known pre-existing failure from data-repo quest reordering —
  regeneration may fix or move it; judge against the known-drift memory, not as a regression).
- [ ] Manual spot-check on the dev server: `?lng=ko-KR` map screen + one wiki quest page.
- [ ] Commit `data/` (artifact repo): `data: regenerate with en-US/ko-KR (BCP 47)`

---

## Self-review notes

- Spec coverage: tag unification (both apps, canonical table), palworld all-16 (A1–A5),
  aion2 ko-KR (B1–B6), aion2 en→en-US rename (B3–B6). Legacy `public/locales/en/items|markers|regions|classes`
  are unused by the app (verified: no source references) — they ride along in the `git mv` unchanged.
- Old-user migration: localStorage `i18nextLng=en` remapped in both apps (A4/B4).
- Backend repo: no language tags found in scope; untouched.
- Palworld boss `sortKey` uses characterId, unaffected by per-language names, so marker ids
  stay stable across languages.
