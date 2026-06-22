import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/features/auth/useAuth'
import { isOwner } from '@/utils/isOwner'
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
  const { planName } = usePlan()
  const { user } = useAuth()

  // Show the Org tab if: already admin in an org workspace, OR can create orgs
  // (Studio plan or owner bypass — same pattern as OrganizacionPage.canCreateOrg).
  const canCreateOrg = planName === 'studio' || isOwner(user?.email)
  const showOrgTab = (activeWorkspace.type === 'org' && activeWorkspace.role === 'admin') || canCreateOrg
  const isOrgActive = location.pathname === '/organizacion'

  return (
    <nav className="border-b border-borde-light bg-blanco">
      <div className="max-w-5xl mx-auto px-6 flex items-center">
        {/* Tabs — overflow-x-auto for narrow screens, but WorkspaceSwitcher must stay
            OUTSIDE this container: overflow-x:auto implicitly sets overflow-y:auto,
            which clips the dropdown that extends below the nav. */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
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
        </div>
        {/* WorkspaceSwitcher is a sibling div — NOT inside the overflow-x-auto container */}
        <div className="shrink-0 py-1.5 pl-2">
          <WorkspaceSwitcher />
        </div>
      </div>
    </nav>
  )
}
