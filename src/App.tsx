import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { EditorPage } from '@/pages/EditorPage'
import { SharePage } from '@/pages/SharePage'
import { PricingPage } from '@/pages/PricingPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { IntegrantesPage } from '@/pages/IntegrantesPage'
import { GruposPage } from '@/pages/GruposPage'
import { EventosPage } from '@/pages/EventosPage'
import { MobilePreviewPage } from '@/pages/MobilePreviewPage'
import { ReportesPage } from '@/pages/ReportesPage'
import { OrganizacionPage } from '@/pages/OrganizacionPage'
import { InvitePage } from '@/pages/InvitePage'
import { AuthPage } from '@/features/auth/AuthPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CookieBanner } from '@/components/ui/CookieBanner'
import { useAuth } from '@/features/auth/useAuth'
import { useSessionGuard } from '@/hooks/useSessionGuard'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useWorkspaceStore } from '@/store/workspaceStore'

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-crema flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-rojo border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  useSessionGuard(user)
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  return <>{children}</>
}

function EditorOrMobile() {
  const isMobile = useIsMobile()
  return isMobile ? <MobilePreviewPage /> : <ErrorBoundary><EditorPage /></ErrorBoundary>
}

function AppWithAuth() {
  const { user } = useAuth()
  const { loadMemberships } = useWorkspaceStore()

  // Load org memberships once the user is authenticated.
  // Pass user.id directly to avoid a redundant supabase.auth.getUser() network
  // call that can race with the Google OAuth token exchange on fresh logins.
  useEffect(() => {
    if (user) loadMemberships(user.id)
  }, [user, loadMemberships])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/integrantes" element={<ProtectedRoute><IntegrantesPage /></ProtectedRoute>} />
      <Route path="/grupos" element={<ProtectedRoute><GruposPage /></ProtectedRoute>} />
      <Route path="/eventos" element={<ProtectedRoute><EventosPage /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute><ReportesPage /></ProtectedRoute>} />
      <Route path="/organizacion" element={<ProtectedRoute><OrganizacionPage /></ProtectedRoute>} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route
        path="/editor/:projectId"
        element={
          <ProtectedRoute>
            <EditorOrMobile />
          </ProtectedRoute>
        }
      />
      <Route path="/share/:token" element={<SharePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/privacy" element={<Navigate to="/privacidad" replace />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/terms" element={<Navigate to="/terminos" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <CookieBanner />
      <BrowserRouter>
        <AppWithAuth />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
