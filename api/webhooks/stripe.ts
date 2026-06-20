import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-05-27.dahlia',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

function planFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY ?? '']: 'solo_pro',
    [process.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY  ?? '']: 'solo_pro',
    [process.env.VITE_STRIPE_PRICE_STUDIO_MONTHLY   ?? '']: 'studio',
    [process.env.VITE_STRIPE_PRICE_STUDIO_YEARLY    ?? '']: 'studio',
  }
  return map[priceId] ?? 'free'
}

function cycleFromPriceId(priceId: string): string {
  const yearly = [
    process.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY ?? '',
    process.env.VITE_STRIPE_PRICE_STUDIO_YEARLY   ?? '',
  ]
  return yearly.includes(priceId) ? 'yearly' : 'monthly'
}

async function upsert(userId: string, patch: Record<string, unknown>) {
  await supabase.from('user_plans').upsert({ user_id: userId, ...patch })
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature'] as string
  const rawBody = await getRawBody(req)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id ?? session.client_reference_id
        if (!userId) break
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = sub as any
        const priceId = s.items.data[0]?.price?.id ?? ''
        await upsert(userId, {
          plan:                   planFromPriceId(priceId),
          billing_cycle:          cycleFromPriceId(priceId),
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
          stripe_price_id:        priceId,
          subscription_status:    s.status,
          current_period_start:   new Date(s.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(s.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:   s.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any
        const { data } = await supabase
          .from('user_plans').select('user_id').eq('stripe_subscription_id', sub.id).maybeSingle()
        if (!data?.user_id) break
        const priceId = sub.items.data[0]?.price?.id ?? ''
        await upsert(data.user_id, {
          plan:                   planFromPriceId(priceId),
          billing_cycle:          cycleFromPriceId(priceId),
          stripe_price_id:        priceId,
          subscription_status:    sub.status,
          current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:   sub.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const { data } = await supabase
          .from('user_plans').select('user_id').eq('stripe_subscription_id', sub.id).maybeSingle()
        if (!data?.user_id) break
        await upsert(data.user_id, {
          plan: 'free', subscription_status: 'canceled',
          stripe_subscription_id: null, stripe_price_id: null, cancel_at_period_end: false,
        })
        break
      }

      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        const { data } = await supabase
          .from('user_plans').select('user_id').eq('stripe_customer_id', inv.customer).maybeSingle()
        if (!data?.user_id) break
        const subId = typeof (inv as any).subscription === 'string'
          ? (inv as any).subscription
          : (inv as any).subscription?.id
        if (!subId) break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = await stripe.subscriptions.retrieve(subId) as any
        await upsert(data.user_id, {
          subscription_status: 'active',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const { data } = await supabase
          .from('user_plans').select('user_id').eq('stripe_customer_id', inv.customer).maybeSingle()
        if (!data?.user_id) break
        await upsert(data.user_id, { subscription_status: 'past_due' })
        break
      }
    }
  } catch (err) {
    console.error(`Error procesando ${event.type}:`, err)
  }

  res.json({ received: true })
}
