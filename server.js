import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const DIST = path.join(__dirname, 'dist')

// ── Clientes ────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
})

// Service role bypasses RLS — solo usar en servidor
const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

const APP_URL = process.env.VITE_APP_URL ?? 'http://localhost:5173'

// ── Helpers ──────────────────────────────────────────────────────────────────

function planFromPriceId(priceId) {
  const map = {
    [process.env.VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY]: 'solo_pro',
    [process.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY]:  'solo_pro',
    [process.env.VITE_STRIPE_PRICE_STUDIO_MONTHLY]:   'studio',
    [process.env.VITE_STRIPE_PRICE_STUDIO_YEARLY]:    'studio',
  }
  return map[priceId] ?? 'free'
}

function billingCycleFromPriceId(priceId) {
  const yearly = [
    process.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY,
    process.env.VITE_STRIPE_PRICE_STUDIO_YEARLY,
  ]
  return yearly.includes(priceId) ? 'yearly' : 'monthly'
}

async function upsertUserPlan(userId, patch) {
  await supabase.from('user_plans').upsert({ user_id: userId, ...patch })
}

// ── Middlewares ──────────────────────────────────────────────────────────────

// Webhook necesita raw body ANTES del parser JSON
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(express.static(DIST))

// ── CORS básico para dev local ───────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ── PASO 1: Checkout ─────────────────────────────────────────────────────────

app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { price_id, user_id, user_email } = req.body

    if (!price_id || !user_id) {
      return res.status(400).json({ error: 'price_id y user_id son requeridos' })
    }

    const isSoloPro = [
      process.env.VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY,
      process.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY,
    ].includes(price_id)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      ...(isSoloPro && { subscription_data: { trial_period_days: 14 } }),
      client_reference_id: user_id,
      customer_email: user_email ?? undefined,
      success_url: `${APP_URL}/projects?checkout=success`,
      cancel_url:  `${APP_URL}/pricing?checkout=canceled`,
      metadata: { user_id },
      allow_promotion_codes: true,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── PASO 2: Webhook ───────────────────────────────────────────────────────────

app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id ?? session.client_reference_id
        if (!userId) break

        const sub = await stripe.subscriptions.retrieve(session.subscription)
        const priceId = sub.items.data[0]?.price?.id

        await upsertUserPlan(userId, {
          plan:                   planFromPriceId(priceId),
          billing_cycle:          billingCycleFromPriceId(priceId),
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
          stripe_price_id:        priceId,
          subscription_status:    sub.status,
          current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:   sub.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const { data } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle()
        if (!data?.user_id) break

        const priceId = sub.items.data[0]?.price?.id
        await upsertUserPlan(data.user_id, {
          plan:                   planFromPriceId(priceId),
          billing_cycle:          billingCycleFromPriceId(priceId),
          stripe_price_id:        priceId,
          subscription_status:    sub.status,
          current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:   sub.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle()
        if (!data?.user_id) break

        await upsertUserPlan(data.user_id, {
          plan:                   'free',
          subscription_status:    'canceled',
          stripe_subscription_id: null,
          stripe_price_id:        null,
          cancel_at_period_end:   false,
        })
        break
      }

      case 'invoice.paid': {
        const inv = event.data.object
        const { data } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_customer_id', inv.customer)
          .maybeSingle()
        if (!data?.user_id) break

        const sub = await stripe.subscriptions.retrieve(inv.subscription)
        await upsertUserPlan(data.user_id, {
          subscription_status:  'active',
          current_period_end:   new Date(sub.current_period_end * 1000).toISOString(),
        })
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object
        const { data } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_customer_id', inv.customer)
          .maybeSingle()
        if (!data?.user_id) break

        // No downgrade inmediato — solo marcar past_due
        await upsertUserPlan(data.user_id, { subscription_status: 'past_due' })
        break
      }
    }
  } catch (err) {
    console.error(`Error procesando ${event.type}:`, err)
    // Devolver 200 igual — evita que Stripe reintente indefinidamente
  }

  res.json({ received: true })
})

// ── PASO 2b: Portal de cliente (cancelar / cambiar plan) ─────────────────────

app.post('/api/stripe/portal', async (req, res) => {
  try {
    const { user_id } = req.body
    const { data } = await supabase
      .from('user_plans')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!data?.stripe_customer_id) {
      return res.status(404).json({ error: 'No se encontró el cliente de Stripe' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   data.stripe_customer_id,
      return_url: `${APP_URL}/projects`,
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── SPA fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Crewficina server running on port ${PORT}`)
})
