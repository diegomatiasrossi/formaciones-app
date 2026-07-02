import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// Code-splitting por ruta: cada página carga su chunk solo cuando se navega
// a ella. Las páginas usan named exports, así que se re-envuelven en {default}.
const LandingPage      = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const ProjectsPage     = lazy(() => import('@/pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const EditorPage       = lazy(() => import('@/pages/EditorPage').then(m => ({ default: m.EditorPage })))
const SharePage        = lazy(() => import('@/pages/SharePage').then(m => ({ default: m.SharePage })))
const PricingPage      = lazy(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const PrivacyPage      = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const TermsPage        = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })))
const IntegrantesPage  = lazy(() => import('@/pages/IntegrantesPage').then(m => ({ default: m.IntegrantesPage })))
const GruposPage       = lazy(() => import('@/pages/GruposPage').then(m => ({ default: m.GruposPage })))
const EventosPage      = lazy(() => import('@/pages/EventosPage').then(m => ({ default: m.EventosPage })))
const MobilePreviewPage = lazy(() => import('@/pages/MobilePreviewPage').then(m => ({ default: m.MobilePreviewPage })))
const ReportesPage     = lazy(() => import('@/pages/ReportesPage').then(m => ({ default: m.ReportesPage })))
const OrganizacionPage = lazy(() => import('@/pages/OrganizacionPage').then(m => ({ default: m.OrganizacionPage })))
const InvitePage       = lazy(() => import('@/pages/InvitePage').then(m => ({ default: m.InvitePage })))
const AuthPage         = lazy(() => import('@/features/auth/AuthPage').then(m => ({ default: m.AuthPage })))
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CookieBanner } from '@/components/ui/CookieBanner'
import { WhatsAppWidget } from '@/components/ui/WhatsAppWidget'
import { trackGA4Event } from '@/lib/ga4'
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
  const location = useLocation()
  const isEditor = location.pathname.startsWith('/editor/')

  // Dispara page_view en cada cambio de ruta subsiguiente (SPA).
  // send_page_view:false en la config evita duplicado en la carga inicial.
  // trackGA4Event tiene guard ga4Loaded: sin consentimiento es no-op.
  useEffect(() => {
    trackGA4Event('page_view', { page_path: location.pathname })
  }, [location.pathname])

  // Cubre el page_view de la PRIMERA página de la sesión: el efecto de arriba
  // ya corrió antes de que el script de gtag terminara de cargar (race condition
  // async). Cuando 'ga4-ready' llega, ga4Loaded ya es true y disparamos con el
  // pathname vigente en ese momento. En conexiones lentas puede llegar un
  // page_view extra si el usuario ya navegó, pero es preferible a perder el dato.
  useEffect(() => {
    function handleGA4Ready() {
      trackGA4Event('page_view', { page_path: location.pathname })
    }
    window.addEventListener('ga4-ready', handleGA4Ready)
    return () => window.removeEventListener('ga4-ready', handleGA4Ready)
  // location.pathname como dep para que el closure siempre capture el pathname
  // actual si el componente re-renderizó entre que se montó y llegó 'ga4-ready'.
  }, [location.pathname])

  // Load org memberships once the user is authenticated.
  // Pass user.id directly to avoid a redundant supabase.auth.getUser() network
  // call that can race with the Google OAuth token exchange on fresh logins.
  useEffect(() => {
    if (user) loadMemberships(user.id)
  }, [user, loadMemberships])

  return (
    <>
      {!isEditor && <WhatsAppWidget />}
      <Suspense fallback={<FullScreenLoader />}>
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
    </Suspense>
    </>
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
