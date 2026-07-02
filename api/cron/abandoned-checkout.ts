// Cron de carritos abandonados — corre cada 30 min vía Vercel Cron.
// Detecta checkout.sessions con status='open' creadas hace más de 2hs
// y manda un mail de recuperación por cada una, una sola vez.
//
// Dedup persistente: tabla `abandoned_checkout_emails` en Supabase
// (session_id PK). Antes de enviar se consulta si ya existe; después
// de enviar exitosamente se inserta. Usa service role (bypasea RLS).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../lib/sendEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-05-27.dahlia',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

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

/** Devuelve true si ya se mandó mail para esta sesión (dedup persistente). */
async function alreadySent(sessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('abandoned_checkout_emails')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle()
  return !!data
}

/** Registra el envío para evitar duplicados en ejecuciones futuras. */
async function markSent(sessionId: string): Promise<void> {
  await supabase
    .from('abandoned_checkout_emails')
    .insert({ session_id: sessionId })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const cutoffTs = Math.floor((Date.now() - TWO_HOURS_MS) / 1000)
  let totalSent = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.checkout.sessions.list({
      status: 'open',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    hasMore = page.has_more
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id

    for (const session of page.data) {
      if (session.created >= cutoffTs) continue
      if (session.payment_status === 'paid') continue

      const email = session.customer_details?.email ?? session.customer_email
      if (!email) continue

      // Dedup persistente: skip si ya se mandó en una ejecución anterior.
      if (await alreadySent(session.id)) continue

      try {
        await sendEmail(
          email,
          '¿Tuviste algún problema con el pago?',
          buildEmailHtml(),
        )
        await markSent(session.id)
        totalSent++
        console.log(`[abandoned-checkout] mail enviado a ${email} (session ${session.id})`)
      } catch (err) {
        console.error(`[abandoned-checkout] error enviando a ${email}:`, err)
      }
    }

    // Stripe ordena por created desc: si la más antigua de la página es
    // más nueva que el cutoff, no hay más sesiones elegibles.
    const oldest = page.data[page.data.length - 1]
    if (oldest && oldest.created >= cutoffTs) hasMore = false
  }

  console.log(`[abandoned-checkout] finalizado. Mails enviados: ${totalSent}`)
  res.json({ sent: totalSent })
}
