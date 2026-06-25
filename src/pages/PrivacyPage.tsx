import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

export function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-crema text-negro">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-borde-light bg-blanco">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100 transition-opacity">
          <Logo size={26} />
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gris hover:text-negro transition-colors">
          ← Volver
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-semibold mb-2">Política de Privacidad</h1>
        <p className="text-gris text-sm mb-10">Última actualización: junio de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Qué datos recopilamos</h2>
            <p className="text-gris mb-2">Al usar Crewficina, recopilamos:</p>
            <ul className="list-disc list-inside text-gris space-y-1 ml-2">
              <li><strong className="text-negro">Datos de cuenta:</strong> dirección de email y contraseña (encriptada). Si te registrás con Google, recibimos tu email y nombre de perfil público.</li>
              <li><strong className="text-negro">Datos de uso:</strong> proyectos creados, formaciones diseñadas, escenas y configuraciones del editor. Todo esto se guarda en tu cuenta para que puedas acceder desde cualquier dispositivo.</li>
              <li><strong className="text-negro">Datos técnicos:</strong> tipo de navegador, idioma preferido y errores técnicos anónimos para mejorar la app.</li>
              <li><strong className="text-negro">Datos de integrantes:</strong> nombre y apodo opcionales que el crew leader carga sobre los miembros de su crew. Estos datos son ingresados y gestionados por el crew leader bajo su responsabilidad.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Cómo usamos tus datos</h2>
            <ul className="list-disc list-inside text-gris space-y-1 ml-2">
              <li>Proveer y mejorar el servicio de Crewficina</li>
              <li>Gestionar tu cuenta y autenticación</li>
              <li>Procesar pagos (a través de Stripe)</li>
              <li>Enviarte comunicaciones relacionadas con el servicio (no spam)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Proveedores de servicios</h2>
            <div className="space-y-3 text-gris">
              <div>
                <strong className="text-negro">Supabase</strong> — base de datos y autenticación. Tus datos se almacenan en servidores seguros de Supabase (AWS). Política de privacidad: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-dorado-oscuro hover:text-dorado underline">supabase.com/privacy</a>
              </div>
              <div>
                <strong className="text-negro">Stripe</strong> — procesamiento de pagos. Crewficina nunca almacena datos de tarjetas de crédito. Stripe los gestiona de forma segura y certificada (PCI-DSS). Política de privacidad: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-dorado-oscuro hover:text-dorado underline">stripe.com/privacy</a>
              </div>
              <div>
                <strong className="text-negro">Vercel</strong> — infraestructura de hosting. Los archivos estáticos y las funciones serverless se ejecutan en Vercel. Política de privacidad: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-dorado-oscuro hover:text-dorado underline">vercel.com/legal/privacy-policy</a>
              </div>
              <div>
                <strong className="text-negro">Sentry</strong> — monitoreo de errores técnicos. Captura errores anónimos del navegador para mejorar la estabilidad de la plataforma. Nunca captura datos personales ni contenido de los proyectos. Política de privacidad: <a href="https://sentry.io/privacy" target="_blank" rel="noopener noreferrer" className="text-dorado-oscuro hover:text-dorado underline">sentry.io/privacy</a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Cookies</h2>
            <p className="text-gris">Usamos cookies para:</p>
            <ul className="list-disc list-inside text-gris space-y-1 ml-2 mt-2">
              <li><strong className="text-negro">Esenciales:</strong> mantener tu sesión iniciada, guardar tu preferencia de idioma.</li>
              <li><strong className="text-negro">Funcionales (opcionales):</strong> recordar configuraciones del editor.</li>
            </ul>
            <p className="text-gris mt-2">No usamos cookies de publicidad ni de seguimiento de terceros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. No vendemos tus datos</h2>
            <p className="text-gris">
              Crewficina no vende, alquila ni comparte tus datos personales con terceros con fines comerciales. Punto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Tus derechos</h2>
            <p className="text-gris mb-2">Tenés derecho a:</p>
            <ul className="list-disc list-inside text-gris space-y-1 ml-2">
              <li>Acceder a tus datos personales</li>
              <li>Solicitar la corrección de datos inexactos</li>
              <li>Solicitar la eliminación de tu cuenta y todos tus datos</li>
              <li>Exportar tus proyectos (desde el editor → Exportar PNG)</li>
            </ul>
            <p className="text-gris mt-2">Para ejercer cualquiera de estos derechos, escribinos a <a href="mailto:hola@crewficina.com" className="text-dorado-oscuro hover:text-dorado">hola@crewficina.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Retención de datos</h2>
            <p className="text-gris">
              Guardamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, borramos todos tus proyectos y datos personales en un plazo de 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Edad mínima</h2>
            <p className="text-gris">
              Crewficina está dirigido a crew leaders mayores de 18 años. Los datos de integrantes que pueden incluir personas menores de edad son responsabilidad del crew leader que los carga. Crewficina no recopila datos directamente de menores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Contacto</h2>
            <p className="text-gris">
              Para preguntas sobre privacidad o para ejercer tus derechos:
              <br />
              <a href="mailto:hola@crewficina.com" className="text-dorado-oscuro hover:text-dorado font-medium">hola@crewficina.com</a>
            </p>
          </section>

        </div>
      </div>

      {/* Footer mínimo */}
      <footer className="px-8 py-5 border-t border-borde-light text-center text-[11px] text-gris flex flex-wrap items-center justify-center gap-3">
        <span>© 2026 Crewficina — <a href="/" className="hover:text-dorado-oscuro">crewficina.com</a></span>
        <span>·</span>
        <a href="/terminos" className="hover:text-dorado-oscuro">Términos</a>
      </footer>
    </div>
  )
}
