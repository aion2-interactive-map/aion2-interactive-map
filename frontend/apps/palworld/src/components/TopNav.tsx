import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ShellTopBar, ThemeToggle, type ShellNavItem } from '@gamemap/map-shell'
import { LANGUAGES, LANGUAGE_LABELS } from '../i18n'

export type NavKey = '/' | '/pals' | '/breeding' | '/items' | '/buildings' | '/technology'

/**
 * Unified top navigation shared by every page (map, Paldeck, breeding). The
 * active page is highlighted via the shell's `nav` feature; routing stays here
 * so the shell package remains router-agnostic.
 */
export function TopNav({ active }: { active: NavKey }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'en-US'

  const items: ShellNavItem[] = [
    { key: '/', label: t('breeding.navMap'), active: active === '/' },
    { key: '/pals', label: t('pal.title'), active: active === '/pals' },
    { key: '/breeding', label: t('breeding.navBreeding'), active: active === '/breeding' },
    { key: '/items', label: t('item.title'), active: active === '/items' },
    { key: '/buildings', label: t('building.title'), active: active === '/buildings' },
    { key: '/technology', label: t('tech.title'), active: active === '/technology' },
  ]

  return (
    <ShellTopBar
      classNames={{ root: 'border-b border-border bg-card text-card-foreground' }}
      nav={{
        items,
        renderItem: (item, className) => (
          <Link to={item.key as NavKey} className={className}>
            {item.label}
          </Link>
        ),
      }}
      languageSwitcher={{
        languages: LANGUAGES.map((code) => ({ code, label: LANGUAGE_LABELS[code] })),
        current: lng,
        onChange: (code) => void i18n.changeLanguage(code),
        menuLabel: 'language',
      }}
      rightExtras={
        <ThemeToggle labels={{ auto: t('themeAuto'), light: t('themeLight'), dark: t('themeDark') }} />
      }
    />
  )
}
