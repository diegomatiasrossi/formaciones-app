import Stripe from 'stripe'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
})

const APP_URL = process.env.VITE_APP_URL ?? 'https://crewficina.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { price_id, user_id, user_email } = req.body

  if (!price_id || !user_id) {
    return res.status(400).json({ error: 'price_id y user_id son requeridos' })
  }

  const soloPro = [
    process.env.VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY,
    process.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY,
  ]

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      ...(soloPro.includes(price_id) && { subscription_data: { trial_period_days: 14 } }),
      client_reference_id: user_id,
      customer_email: user_email ?? undefined,
      success_url: `${APP_URL}/projects?checkout=success`,
      cancel_url:  `${APP_URL}/pricing?checkout=canceled`,
      metadata: { user_id },
      allow_promotion_codes: true,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
