import { useTranslation } from 'react-i18next'
import type { Taxonomy, TypesLocale } from '../lib/data'

interface Props {
  types: Taxonomy
  typesL10n: TypesLocale
  visible: Set<string>
  onToggle: (subtypeId: string) => void
  onSetAll: (on: boolean) => void
}

export function Sidebar({ types, typesL10n, visible, onToggle, onSetAll }: Props) {
  const { t } = useTranslation()
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-100">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">{t('categories')}</span>
        <span className="flex gap-2 text-xs">
          <button className="text-amber-400 hover:underline" onClick={() => onSetAll(true)}>{t('showAll')}</button>
          <button className="text-neutral-400 hover:underline" onClick={() => onSetAll(false)}>{t('hideAll')}</button>
        </span>
      </div>
      {types.categories.map((cat) => (
        <section key={cat.id} className="mb-3">
          <h2 className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
            {typesL10n.categories[cat.id]?.name ?? cat.id}
          </h2>
          {types.subtypes.filter((s) => s.category === cat.id).map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-neutral-800">
              <input
                type="checkbox"
                data-testid={`subtype-toggle-${s.id}`}
                checked={visible.has(s.id)}
                onChange={() => onToggle(s.id)}
              />
              <span>{typesL10n.subtypes[s.id]?.name ?? s.id}</span>
            </label>
          ))}
        </section>
      ))}
    </aside>
  )
}
