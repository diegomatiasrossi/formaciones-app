# FORMACIONES — SaaS Coreográfico

Editor de formaciones coreográficas con conciencia espacial total, animación entre escenas, links compartibles y planes.

**Stack:** React 18 + Vite + TypeScript + Konva.js + Zustand + Tailwind + Supabase

---

## Setup rápido

```bash
# 1. Instalar Node.js 18+ desde https://nodejs.org

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editá .env con tus credenciales (ver sección Supabase abajo)

# 4. Correr en desarrollo
npm run dev
# → http://localhost:5173

# 5. Build para producción
npm run build

# 6. Servir el build (Express SPA server)
npm start
```

---

## Variables de entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_APP_URL=https://tu-dominio.com

# Descomentar cuando se active Stripe:
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_SECRET_KEY=sk_live_...  ← SOLO en el servidor, nunca en el frontend
```

---

## Supabase — SQL completo

Ejecutar en orden en el SQL Editor de Supabase:

```sql
-- ─── TABLA BASE ───────────────────────────────────────────────────────────────
create table if not exists projects (
  id          text primary key,
  name        text not null,
  data        jsonb,
  owner_id    uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table projects enable row level security;
create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── METADATA DE PROYECTO ─────────────────────────────────────────────────────
alter table projects add column if not exists group_name          text;
alter table projects add column if not exists choreography_name   text;
alter table projects add column if not exists stage_ratio         text default '16:9';

-- ─── LINK COMPARTIBLE ─────────────────────────────────────────────────────────
alter table projects add column if not exists share_token         text unique;
alter table projects add column if not exists share_show_names    boolean default true;

create policy "Public share read"
  on projects for select
  using (share_token is not null);

-- ─── SESIONES ÚNICAS ──────────────────────────────────────────────────────────
create table if not exists user_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  session_token text not null unique,
  last_seen     timestamptz default now(),
  user_agent    text,
  created_at    timestamptz default now()
);
create unique index if not exists one_active_session_per_user on user_sessions(user_id);
alter table user_sessions enable row level security;
create policy "Users own sessions" on user_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── PLANES ───────────────────────────────────────────────────────────────────
create table if not exists user_plans (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  plan                   text not null default 'free',
  projects_purchased     integer default 0,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan_expires_at        timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);
alter table user_plans enable row level security;
create policy "Users read own plan" on user_plans for select
  using (auth.uid() = user_id);

-- ─── WAITLIST ─────────────────────────────────────────────────────────────────
create table if not exists waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  plan_interest text,
  created_at    timestamptz default now()
);
```

---

## Deploy en Vercel (recomendado)

1. Conectar el repo de GitHub a [vercel.com](https://vercel.com) (auto-deploy en cada push)
2. Agregar variables de entorno en Vercel → Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` (la URL de tu proyecto Vercel, ej: `https://formaciones.vercel.app`)
3. El archivo `vercel.json` ya configura el SPA fallback automáticamente

O desde la CLI:
```bash
npm i -g vercel
vercel
```

---

## Deploy en Hostinger (VPS / Shared)

```bash
# 1. Build
npm run build

# 2. Copiar dist/ al servidor via FTP o SSH
scp -r dist/ usuario@tu-servidor:/home/user/public_html/

# 3. Si usás VPS con Node.js, correr el Express server:
npm start
# Con PM2 (recomendado para producción):
npm i -g pm2
pm2 start server.js --name formaciones
pm2 save
pm2 startup

# 4. Configurar Nginx como reverse proxy (VPS):
# server {
#   listen 80;
#   server_name tu-dominio.com;
#   location / {
#     proxy_pass http://localhost:3000;
#   }
# }
```

---

## Estructura del proyecto

```
src/
  types/              → Tipos TypeScript del dominio (Dancer, Scene, Project…)
  lib/
    formations.ts     → Generadores de formaciones (funciones puras)
    geometry.ts       → Utilidades matemáticas
  store/
    editorStore.ts    → Estado del editor (Zustand + undo/redo)
    projectStore.ts   → CRUD de proyectos (Supabase)
  i18n/               → Traducciones ES / EN
  hooks/
    useAnimationPlayer.ts → Interpolación cubic ease-in-out entre escenas
    useSessionGuard.ts    → Seguridad de sesión única
    usePlan.ts            → Límites por plan
    useIsMobile.ts        → Detección mobile
  features/
    editor/           → Canvas (Konva), toolbar, sidebar
    scenes/           → Panel multi-escena
    auth/             → Login/signup + sessionGuard
    tutorial/         → TutorialOverlay 11 pasos
  pages/
    LandingPage       → Landing con demo Konva animado
    ProjectsPage      → Listado y creación de proyectos
    EditorPage        → Editor principal
    SharePage         → Vista pública de solo lectura
    MobilePreviewPage → Preview mobile
    PricingPage       → Planes y waitlist
  components/ui/      → Modal, ShareModal, FormationDemo, DancerPropertiesPanel…
server.js             → Express SPA server (para VPS/Hostinger)
vercel.json           → Config SPA fallback para Vercel
```

---

## Roadmap

| Versión | Estado |
|---|---|
| **MVP** — Editor + formaciones + niveles + multi-escena + auth + PNG | ✅ |
| **v1.5** — Audio sincronizado + transiciones animadas + demo en landing | ✅ |
| **v2.0** — Share link + mobile + tutorial + sesión única + planes | ✅ |
| **v2.5** — Stripe activo + exportar video + PDF | Próximo |
| **v3** — Colaboración en tiempo real + PWA | — |

---

*Diego "Póleo" Rossi — diegopoleo.com*
