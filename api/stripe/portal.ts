import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

const APP_URL = process.env.VITE_APP_URL ?? 'https://crewficina.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' })

  try {
    const { data } = await supabase
      .from('user_plans')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!data?.stripe_customer_id) {
      return res.status(404).json({ error: 'No se encontró el cliente de Stripe' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${APP_URL}/projects`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
