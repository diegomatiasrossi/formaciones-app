import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useCrewStore } from '@/store/crewStore'
import clsx from 'clsx'

export function WorkspaceSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeWorkspace, memberships, switchToPersonal, switchToOrg } = useWorkspaceStore()
  const { fetchAll } = useCrewStore()
  const [open, setOpen] = useState(false)

  // Don't render if user has no org memberships
  if (memberships.length === 0) return null

  const isPersonal = activeWorkspace.type === 'personal'
  const currentLabel = isPersonal
    ? t('org.my_account')
    : activeWorkspace.orgName

  const currentRole = isPersonal
    ? null
    : t(`org.role_${activeWorkspace.role}`)

  async function handleSwitch(type: 'personal' | 'org', orgId?: string) {
    if (type === 'personal') switchToPersonal()
    else if (orgId) switchToOrg(orgId)
    setOpen(false)
    await fetchAll()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-borde-light bg-blanco hover:border-rojo/40 transition-colors text-left"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-negro truncate max-w-[140px]">{currentLabel}</span>
          {currentRole && (
            <span className="text-[10px] text-gris">{currentRole}</span>
          )}
        </div>
        <span className="text-gris text-[10px] shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full mt-1.5 left-0 w-56 bg-blanco border border-borde-light rounded-xl shadow-card z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-borde-light">
              <p className="text-[10px] text-gris uppercase tracking-wider">{t('org.workspace_switcher')}</p>
            </div>

            {/* Personal */}
            <button
              onClick={() => handleSwitch('personal')}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-crema transition-colors',
                isPersonal && 'bg-crema',
              )}
            >
              <span className="text-base">◉</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-negro">{t('org.my_account')}</div>
                <div className="text-[10px] text-gris">Espacio personal</div>
              </div>
              {isPersonal && <span className="ml-auto text-rojo text-xs">✓</span>}
            </button>

            {/* Org workspaces */}
            <div className="border-t border-borde-light px-3 pt-2 pb-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gris/50">Organizaciones</p>
            </div>
            {memberships.map(m => {
              const isActive = activeWorkspace.type === 'org' && activeWorkspace.orgId === m.organizationId
              return (
                <button
                  key={m.organizationId}
                  onClick={() => handleSwitch('org', m.organizationId)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-crema transition-colors',
                    isActive && 'bg-crema',
                  )}
                >
                  <span className="text-base">⬡</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-negro truncate">{m.organizationName}</div>
                    <div className="text-[10px] text-gris">{t(`org.role_${m.role}`)}</div>
                  </div>
                  {isActive && <span className="ml-auto text-rojo text-xs">✓</span>}
                </button>
              )
            })}

            {/* Admin: manage org link */}
            {activeWorkspace.type === 'org' && activeWorkspace.role === 'admin' && (
              <div className="border-t border-borde-light">
                <button
                  onClick={() => { setOpen(false); navigate('/organizacion') }}
                  className="w-full px-3 py-2 text-left text-[11px] text-gris hover:text-rojo hover:bg-crema transition-colors"
                >
                  ⚙ {t('org.org_management')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
