import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import clsx from 'clsx'

type ModuleKey = 'space' | 'members' | 'groups' | 'events' | 'reports'

const MODULES: { key: ModuleKey; icon: string; route: string; labelKey: string }[] = [
  { key: 'space',   icon: '⬡', route: '/projects',   labelKey: 'nav.space' },
  { key: 'members', icon: '◉', route: '/integrantes', labelKey: 'nav.members' },
  { key: 'groups',  icon: '⬢', route: '/grupos',      labelKey: 'nav.groups' },
  { key: 'events',  icon: '◈', route: '/eventos',     labelKey: 'nav.events' },
  { key: 'reports', icon: '◎', route: '/reportes',    labelKey: 'nav.reports' },
]

export function ModuleNav({ active }: { active: ModuleKey }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { activeWorkspace } = useWorkspaceStore()

  const showOrgTab = activeWorkspace.type === 'org' && activeWorkspace.role === 'admin'
  const isOrgActive = location.pathname === '/organizacion'

  return (
    <nav className="border-b border-borde-light bg-blanco">
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
        {MODULES.map(m => (
          <button key={m.key} onClick={() => navigate(m.route)}
            className={clsx('flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              active === m.key ? 'border-rojo text-rojo' : 'border-transparent text-gris hover:text-negro')}>
            <span>{m.icon}</span>{t(m.labelKey)}
          </button>
        ))}
        {showOrgTab && (
          <button
            onClick={() => navigate('/organizacion')}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              isOrgActive ? 'border-rojo text-rojo' : 'border-transparent text-gris hover:text-negro',
            )}
          >
            <span>⚙</span>{t('org.org_management')}
          </button>
        )}
        {/* Workspace switcher — only visible if user belongs to at least one org */}
        <div className="ml-auto shrink-0 py-1.5">
          <WorkspaceSwitcher />
        </div>
      </div>
    </nav>
  )
}
