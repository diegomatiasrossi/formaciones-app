// Cron de carritos abandonados — corre cada 30 min vía Vercel Cron.
// Detecta checkout.sessions con status='open' creadas hace más de 2hs,
// cruza por session.id contra las completadas para no reenviar mails,
// y manda un mail de recuperación por cada una (una sola vez).
//
// Protección de reenvío: se lleva un Set en memoria de IDs ya procesados
// en esta invocación. Para producción real con múltiples instancias sería
// mejor persistir en Redis/DB, pero para el volumen de Crewficina alcanza.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { sendEmail } from '../lib/sendEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-05-27.dahlia',
})

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

// Protege el endpoint: solo Vercel Cron puede invocarlo (header estándar de Vercel).
function isAuthorized(req: VercelRequest): boolean {
  return req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET ?? ''}`
}

function buildEmailHtml(): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:auto;padding:32px 24px;color:#1a1a1a">
      <img src="https://crewficina.com/og-image.png" alt="Crewficina" style="height:40px;margin-bottom:24px" />
      <h2 style="font-size:20px;font-weight:600;margin:0 0 12px">¿Tuviste algún problema con el pago?</h2>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#444">
        Vimos que empezaste a suscribirte a Crewficina pero no llegaste a completar el pago.
        Si tuviste algún problema, respondé este mail o escribinos por WhatsApp y te ayudamos.
      </p>
      <a href="https://wa.me/5493515301180"
         style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;
                text-decoration:none;font-weight:600;font-size:14px">
        Escribinos por WhatsApp
      </a>
      <p style="font-size:12px;color:#999;margin-top:32px">
        Crewficina · <a href="https://crewficina.com" style="color:#C9A961">crewficina.com</a>
      </p>
    </div>
  `
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const cutoffTs = Math.floor((Date.now() - TWO_HOURS_MS) / 1000) // unix seconds
  const sentInThisRun = new Set<string>()
  let totalSent = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    // Paginar sesiones abiertas ordenadas por created desc.
    const page = await stripe.checkout.sessions.list({
      status: 'open',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    hasMore = page.has_more
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id

    for (const session of page.data) {
      // Solo sesiones creadas hace más de 2hs.
      if (session.created >= cutoffTs) continue

      // Si la sesión ya está pagada (Stripe a veces tarda en actualizar status),
      // la saltamos.
      if (session.payment_status === 'paid') continue

      const email = session.customer_details?.email ?? session.customer_email
      if (!email) continue
      if (sentInThisRun.has(session.id)) continue

      try {
        await sendEmail(
          email,
          '¿Tuviste algún problema con el pago?',
          buildEmailHtml(),
        )
        sentInThisRun.add(session.id)
        totalSent++
        console.log(`[abandoned-checkout] mail enviado a ${email} (session ${session.id})`)
      } catch (err) {
        // Loguear el error pero continuar con las demás sesiones.
        console.error(`[abandoned-checkout] error enviando a ${email}:`, err)
      }
    }

    // Si la sesión más antigua de la página es más nueva que el cutoff,
    // no tiene sentido seguir paginando (están ordenadas desc).
    const oldest = page.data[page.data.length - 1]
    if (oldest && oldest.created >= cutoffTs) hasMore = false
  }

  console.log(`[abandoned-checkout] finalizado. Mails enviados: ${totalSent}`)
  res.json({ sent: totalSent })
}
