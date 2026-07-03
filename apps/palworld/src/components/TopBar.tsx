import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

interface Props {
  maps: { id: string; label: string }[]
  activeMapId: string
  onSelectMap: (id: string) => void
}

export function TopBar({ maps, activeMapId, onSelectMap }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <header className="flex h-12 items-center gap-4 border-b border-neutral-700 bg-neutral-900 px-4 text-neutral-100">
      <h1 className="text-sm font-semibold">{t('title')}</h1>
      <nav className="flex gap-1">
        {maps.map((m) => (
          <button
            key={m.id}
            data-testid={`map-tab-${m.id}`}
            onClick={() => onSelectMap(m.id)}
            className={`rounded px-3 py-1 text-sm ${m.id === activeMapId ? 'bg-amber-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <select
        aria-label="language"
        className="ml-auto rounded bg-neutral-800 px-2 py-1 text-sm"
        value={i18n.resolvedLanguage}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </header>
  )
}
