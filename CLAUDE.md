# CLAUDE.md — formaciones-app

Leé este archivo completo antes de tocar cualquier cosa.

---

## QUÉ ES ESTE PROYECTO

SaaS web para que grupos de danza diseñen, planifiquen y analicen coreografías con conciencia espacial total. Editor de formaciones con canvas, audio sincronizado, estadísticas de escenario y planes de monetización.

**Nombre del producto:** Sin definir (opciones: StageMind, StagePlan, EscenaPlan — por decidir con Diego antes de cambiar textos)
**Autor:** Diego "Póleo" Rossi — diegopoleo.com
**Tagline:** "Diseñá el escenario. Antes de que empiece la música."

---

## ESTADO ACTUAL

| Versión | Estado |
|---|---|
| MVP — Editor + formaciones + niveles + multi-escena + auth + PNG | ✅ |
| v1.5 — Audio + transiciones animadas + demo en landing | ✅ |
| v2.0 — Share link + mobile + tutorial + sesión única + planes | ✅ |
| **v2.5 — Stripe activo + PDF + video export** | ⏳ PRÓXIMO |
| v3 — Colaboración en tiempo real + PWA | — |

---

## STACK

| Capa | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Canvas | Konva.js + react-konva |
| Estado | Zustand |
| UI | Tailwind CSS |
| Auth / DB | Supabase (Postgres + Auth + Storage) |
| Audio | wavesurfer.js + Web Audio API |
| i18n | i18next (ES + EN) |
| Pagos | Stripe (comentado — activar en v2.5) |
| Hosting | Vercel (vercel.json ya configurado) |
| Testing | Vitest |

---

## VARIABLES DE ENTORNO

Archivo `.env` (no commiteado — copiar de `.env.example`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=
# Descomentar al activar Stripe (v2.5):
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_SECRET_KEY=sk_live_...  ← SOLO en servidor, nunca en frontend
```

---

## PLANES — ESTADO Y PENDIENTE

### Modelo en el código (`src/hooks/usePlan.ts`) — 4 planes (VIEJO):
`free | starter | pro | studio`

### Modelo validado (`estrategia-negocio-completa.md` — 11/06/2026) — 3 planes (NUEVO):

| Plan | Precio | maxDancers | maxProjects | Audio | Stats | PDF |
|---|---|---|---|---|---|---|
| free | $0 | 15 | 2 | ❌ | ❌ | ❌ |
| solo_pro | $9.99/mes | 50 | ∞ | ✅ | ❌ | ✅ |
| studio | $24.99/mes | ∞ | ∞ | ✅ | ✅ | ✅ |

**Tarea pendiente:** actualizar `usePlan.ts` + `PricingPage.tsx` + `LandingPage.tsx` para reflejar el modelo de 3 planes antes de activar Stripe.

El gancho de conversión principal: **audio bloqueado en Free**.

---

## ARQUITECTURA DE CARPETAS

```
src/
  types/index.ts          → Tipos del dominio (Dancer, Scene, Project, etc.)
  lib/
    formations.ts         → 20+ generadores de formaciones (funciones puras)
    geometry.ts           → Utilidades matemáticas
  store/
    editorStore.ts        → Zustand — estado del editor (undo/redo, selección)
    projectStore.ts       → CRUD proyectos (Supabase)
  i18n/                   → Traducciones ES / EN
  hooks/
    usePlan.ts            → Feature gating por plan ← ACTUALIZAR para v2.5
    useAnimationPlayer.ts → Interpolación entre escenas
    useSessionGuard.ts    → Sesión única por usuario
    useIsMobile.ts        → Detección mobile
  features/
    auth/                 → AuthPage, useAuth, supabaseClient, sessionGuard
    editor/               → StageCanvas, DancerNode, Toolbar, Sidebar, panels
    audio/                → AudioPanel (wavesurfer + marcadores de escena)
    scenes/               → ScenePanel (multi-escena)
    levels/               → LevelSelector (floor/mid/standing/aerial)
    tutorial/             → TutorialOverlay (11 pasos)
  components/ui/          → Modal, ShareModal, UpgradeGate, DancerPropertiesPanel…
  pages/
    LandingPage.tsx       → Demo Konva + pricing + waitlist
    ProjectsPage.tsx      → CRUD de proyectos del usuario
    EditorPage.tsx        → Editor principal
    SharePage.tsx         → Vista pública (token compartible)
    PricingPage.tsx       → Planes — ACTUALIZAR para modelo de 3 planes
    MobilePreviewPage.tsx → Preview mobile
  data/
    quotes.ts             → 24+ frases creativas bilingüe
    articles.ts           → 3 artículos sobre composición coreográfica
    checklist.ts          → Checklist de producción
```

---

## SUPABASE — TABLAS

- `projects` — proyectos del usuario (JSONB data, share_token, stage_ratio, etc.)
- `user_plans` — plan activo (`plan`, `stripe_customer_id`, `stripe_subscription_id`)
- `user_sessions` — sesión única por usuario
- `waitlist` — emails interesados (email único, plan_interest)

SQL completo en `README.md`.

---

## RUTAS DE LA APP

```
/              → LandingPage
/login         → AuthPage (email + Google)
/projects      → ProjectsPage (protegida)
/editor/:id    → EditorPage (protegida)
/share/:token  → SharePage (pública)
/pricing       → PricingPage
```

---

## PRÓXIMOS PASOS (v2.5)

1. **Definir el nombre** — reemplazar "FORMACIONES" en toda la app
2. **Simplificar planes** — `usePlan.ts` y páginas de precios: 4 → 3 planes (free / solo_pro / studio)
3. **Stripe** — checkout para Solo Pro ($9.99/mes) y Studio ($24.99/mes), webhook para actualizar `user_plans`
4. **PDF export** — jsPDF o puppeteer para exportar escenas como PDF
5. **Video export** — fase 2 de v2.5

---

## REGLAS PARA TRABAJAR EN ESTE PROYECTO

1. TypeScript estricto — sin `any` sin justificación
2. i18n: todos los textos visibles al usuario van en `src/i18n/es.ts` y `en.ts`
3. Feature gating: toda feature premium pasa por `usePlan()` + `UpgradeGate`
4. Nunca hardcodear claves de Supabase o Stripe — siempre `import.meta.env.VITE_...`
5. `STRIPE_SECRET_KEY` solo vive en el servidor (`server.js` o Supabase Edge Functions) — nunca en el frontend
6. Correr `npm run dev` para desarrollo local (http://localhost:5173)
7. Build: `npm run build` — el `dist/` ya está en `.gitignore`
