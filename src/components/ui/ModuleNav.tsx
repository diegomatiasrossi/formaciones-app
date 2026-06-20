import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

type ModuleKey = 'space' | 'members' | 'groups' | 'events'

const MODULES: { key: ModuleKey; icon: string; route: string; labelKey: string }[] = [
  { key: 'space',   icon: '⬡', route: '/projects',    labelKey: 'nav.space' },
  { key: 'members', icon: '◉', route: '/integrantes', labelKey: 'nav.members' },
  { key: 'groups',  icon: '⬢', route: '/grupos',      labelKey: 'nav.groups' },
  { key: 'events',  icon: '◈', route: '/eventos',     labelKey: 'nav.events' },
]

export function ModuleNav({ active }: { active: ModuleKey }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <nav className="border-b border-borde-light bg-blanco">
      <div className="max-w-5xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {MODULES.map(m => (
          <button key={m.key} onClick={() => navigate(m.route)}
            className={clsx('flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              active === m.key ? 'border-rojo text-rojo' : 'border-transparent text-gris hover:text-negro')}>
            <span>{m.icon}</span>{t(m.labelKey)}
          </button>
        ))}
      </div>
    </nav>
  )
}
