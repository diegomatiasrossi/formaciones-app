import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './useAuth'
import { Logo } from '@/components/ui/Logo'
import { registerSchema, firstErrorKey } from '@/lib/validation'

export function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/projects'
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // Validación de registro (email + password) antes de llamar a Supabase.
    if (mode === 'signup') {
      const parsed = registerSchema.safeParse({ email, password })
      if (!parsed.success) { setError(t(firstErrorKey(parsed)!)); return }
    }
    setLoading(true)
    const result = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password)
    setLoading(false)
    if (result.error) {
      // Anti-enumeración: en login NO revelamos si el email existe o si la
      // contraseña es incorrecta — mensaje genérico siempre.
      setError(mode === 'signin' ? t('auth.invalid_credentials') : result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      // Supabase requires email confirmation — show the pending screen
      // instead of navigating (user has no session yet)
      setPendingEmail(email)
    } else {
      navigate(redirectTo)
    }
  }

  async function handleGoogle() {
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) setError(err.message)
  }

  if (pendingEmail) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-10">
            <Logo size={34} />
          </div>
          <div className="bg-blanco border border-borde-light rounded-2xl shadow-soft p-8 text-center">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-negro text-base font-semibold mb-3">Revisá tu email</h2>
            <p className="text-sm text-gris leading-relaxed">
              Te enviamos un email a{' '}
              <strong className="text-negro">{pendingEmail}</strong>.
              Hacé click en el link para confirmar tu cuenta y empezar.
            </p>
            <button
              onClick={() => { setPendingEmail(null); setMode('signin') }}
              className="mt-6 text-xs text-gris hover:text-negro underline underline-offset-2 transition-colors"
            >
              Ya confirmé — iniciar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-crema flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size={34} />
        </div>

        <div className="bg-blanco border border-borde-light rounded-2xl shadow-soft p-8">
          <h1 className="text-negro text-lg font-semibold mb-6">
            {mode === 'signin' ? t('auth.sign_in') : t('auth.sign_up')}
          </h1>

          {error && (
            <div className="bg-rojo/8 border border-rojo/30 rounded-lg px-4 py-3 text-rojo text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro
                           focus:outline-none focus:border-rojo transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro
                           focus:outline-none focus:border-rojo transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rojo hover:bg-rojo-oscuro text-blanco font-semibold py-2.5 rounded-lg
                         transition-colors text-sm disabled:opacity-50"
            >
              {loading ? t('common.loading') : (mode === 'signin' ? t('auth.sign_in') : t('auth.sign_up'))}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-borde-light" />
            <span className="text-gris text-xs">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-borde-light" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full border border-borde-light hover:border-gris rounded-lg py-2.5 text-sm
                       text-negro flex items-center justify-center gap-2 transition-colors bg-blanco"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.with_google')}
          </button>

          <p className="text-center text-gris text-xs mt-6">
            {mode === 'signin' ? t('auth.no_account') : t('auth.have_account')}{' '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-rojo hover:text-rojo-oscuro font-medium transition-colors"
            >
              {mode === 'signin' ? t('auth.sign_up') : t('auth.sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
