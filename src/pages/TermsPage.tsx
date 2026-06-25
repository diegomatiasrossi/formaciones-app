import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

export function TermsPage() {
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
        <h1 className="text-3xl font-semibold mb-2">Términos y Condiciones</h1>
        <p className="text-gris text-sm mb-10">Última actualización: junio de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Aceptación de términos</h2>
            <p className="text-gris">
              Al acceder o usar Crewficina (<strong className="text-negro">crewficina.com</strong>), aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no uses el servicio. Nos reservamos el derecho de actualizar estos términos en cualquier momento; los cambios serán notificados por email o mediante un aviso en la app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Descripción del servicio</h2>
            <p className="text-gris mb-2">
              Crewficina es una plataforma SaaS de planificación coreográfica que permite a crew leaders diseñar formaciones, organizar escenas, gestionar integrantes y sincronizar movimiento con audio.
            </p>
            <p className="text-gris">
              El servicio se provee "tal como está" y puede incluir funciones gratuitas y de pago. Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte del servicio con notificación previa razonable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Cuentas y responsabilidad del usuario</h2>
            <ul className="list-disc list-inside text-gris space-y-2 ml-2">
              <li>Sos responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
              <li>Sos responsable de todo el contenido que cargás en tu cuenta, incluyendo datos de integrantes de tu crew.</li>
              <li>No podés usar Crewficina para actividades ilegales, ni compartir contenido que viole derechos de terceros.</li>
              <li>Una cuenta es personal e intransferible. El acceso multi-usuario está disponible únicamente en los planes que lo incluyen.</li>
              <li>Podés eliminar tu cuenta en cualquier momento desde Configuración o escribiéndonos a <a href="mailto:hola@crewficina.com" className="text-dorado-oscuro hover:text-dorado">hola@crewficina.com</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Pagos y cancelaciones</h2>
            <div className="space-y-3 text-gris">
              <p>
                Los planes de pago se facturan de forma mensual o anual según lo seleccionado. Los pagos son procesados de forma segura por <strong className="text-negro">Stripe</strong>; Crewficina nunca almacena datos de tarjetas de crédito.
              </p>
              <p>
                Podés cancelar tu suscripción en cualquier momento desde tu perfil. Al cancelar, conservás acceso al plan pago hasta el fin del período ya abonado; luego pasás automáticamente al plan gratuito.
              </p>
              <p>
                No ofrecemos reembolsos parciales por períodos no utilizados, salvo en casos donde la ley aplicable lo requiera. Si tenés un problema con un cobro, escribinos a <a href="mailto:hola@crewficina.com" className="text-dorado-oscuro hover:text-dorado">hola@crewficina.com</a> y lo resolvemos.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Propiedad intelectual</h2>
            <div className="space-y-3 text-gris">
              <p>
                <strong className="text-negro">Tu contenido es tuyo.</strong> Todo el contenido que creás en Crewficina — proyectos, formaciones, escenas, coreografías — te pertenece. Crewficina no reclama ningún derecho de propiedad sobre tu trabajo.
              </p>
              <p>
                Nos otorgás una licencia limitada, no exclusiva y revocable para almacenar y mostrar tu contenido únicamente con el fin de proveer el servicio. Esta licencia termina cuando eliminás tu contenido o tu cuenta.
              </p>
              <p>
                El software, diseño, marca y código de Crewficina son propiedad de Crewficina y están protegidos por leyes de propiedad intelectual. No podés copiar, redistribuir ni hacer ingeniería inversa de la plataforma.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Limitación de responsabilidad</h2>
            <div className="space-y-3 text-gris">
              <p>
                Crewficina se provee "tal como está", sin garantías de disponibilidad continua o ausencia de errores. Hacemos nuestro mejor esfuerzo para mantener el servicio estable y los datos seguros, pero no podemos garantizar un uptime del 100%.
              </p>
              <p>
                En la máxima medida permitida por la ley, Crewficina no será responsable por pérdida de datos, lucro cesante, o daños indirectos derivados del uso o imposibilidad de uso del servicio.
              </p>
              <p>
                En caso de pérdida de datos atribuible a Crewficina, nuestra responsabilidad máxima se limita al importe abonado por el servicio en los 3 meses anteriores al incidente.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Contacto</h2>
            <p className="text-gris">
              Para preguntas sobre estos términos o cualquier aspecto del servicio:
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
        <a href="/privacidad" className="hover:text-dorado-oscuro">Privacidad</a>
      </footer>
    </div>
  )
}
