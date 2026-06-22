# PENDIENTES — Crewficina
Actualizado: 20/06/2026 — Sesión grande Integrantes/Eventos/Actividades

---

## ✅ SESIÓN GRANDE COMPLETA — 9 fases, 5 commits

### Commit `5c74544` — Fase 1: SQL
- `supabase-modules-migration.sql`: 5 tablas (members, groups, group_members, events, activities)
  + alter projects (group_id, event_id) + RLS por owner + índices
- **⚠️ ACCIÓN REQUERIDA: Diego debe correr este SQL en Supabase SQL Editor**

### Commit `110fdfc` — Fase 2: member_id real (FIX CRÍTICO)
- `Dancer.memberId?: string | null` agregado al tipo
- `crewStore.ts` NUEVO: store unificado (members/groups/events/activities) con CRUD Supabase
- Canvas resuelve nombre por prioridad: member_id real → fallback índice → dancer.name
- EditorPage carga members reales y construye map memberNameById

### Commit `55779ad` — Fases 3-6 + 8: módulos UI + i18n
- `IntegrantesPage.tsx` (/integrantes): CRUD + tipo stage/team + nivel + rol condicional + asignación a grupos
- `GruposPage.tsx` (/grupos): CRUD + detalle con integrantes + eventos + actividades
- `EventosPage.tsx` (/eventos): CRUD + vínculo a proyecto Formaciones + actividades
- `ActivitiesPanel.tsx`: panel reutilizable con contexto automático (event/group)
- `ModuleNav.tsx`: navegación entre los 4 pilares
- i18n completo ES/EN/PT (nav, members, groups, events, activities)

### Commit `7dcda33` — Fase 7: conexión grupo→proyecto
- Modal nuevo proyecto: selector "Vincular a un grupo" → trae integrantes stage como dancers
- Eventos: botón "Crear formación" pasa ?eventId= y pre-abre el modal
- ModuleNav agregado a ProjectsPage

---

## 🟡 DECISIONES QUE TOMÉ POR MI CUENTA (documentadas)

1. **Store unificado en vez de 4 stores separados** (`crewStore.ts`). Más eficiente,
   comparten el patrón CRUD Supabase y el fetchAll trae todo en paralelo.

2. **Grupos como sección propia (`/grupos`)** en vez de dentro de Actividades.
   El prompt dejaba la decisión abierta. Razón: cada grupo tiene su propio detalle
   (integrantes + eventos + actividades), merece ruta propia.

3. **Actividades NO tiene página propia** — viven dentro del detalle de cada Grupo
   y cada Evento vía `ActivitiesPanel`. El `context_type` se infiere automáticamente
   de dónde se renderiza el panel (group/event), sin preguntar al usuario. Esto cumple
   exactamente lo pedido en el prompt.

4. **Compatibilidad hacia atrás preservada**: el viejo `MembersPanel` (project.members
   en JSONB) sigue funcionando como fallback por índice. Los proyectos existentes con
   dancers sin member_id muestran el nombre guardado, no fallan.

5. **Dancers desde grupo**: al vincular un grupo, los integrantes type='stage' se cargan
   en línea horizontal centrada en la primera escena, cada uno con su memberId real.

---

## 🔴 NECESITA ACCIÓN / REVISIÓN DE DIEGO

1. **CORRER EL SQL** `supabase-modules-migration.sql` en Supabase — sin esto los módulos
   no tienen tablas y van a fallar al cargar (mostrarán vacío o error en consola).

2. **Migrar checklist preset viejo → activities**: el prompt pedía migrar `data/checklist.ts`
   (items predeterminados con is_preset=true) a la tabla activities. NO se implementó la
   migración automática — los presets viejos siguen en el ChecklistPanel del editor.
   **Decisión pendiente:** ¿se auto-crean los presets al abrir un evento/grupo por primera
   vez, o se dejan como botón "Cargar checklist base"? Requiere definición de Diego.

3. **Revisión visual de las 3 pantallas nuevas** (Integrantes, Grupos, Eventos) en
   crewficina.com una vez deployado y con el SQL corrido.

4. **Panel de integrantes en el editor**: el prompt pedía que el panel de integrantes
   DENTRO del editor permita asignar member_id real a cada dancer existente (buscar y
   vincular). Esto quedó PARCIAL: el canvas ya resuelve por member_id, y al crear desde
   grupo los dancers vienen con member_id, pero el MembersPanel viejo del editor todavía
   usa project.members (JSONB). Unificar ese panel con el crewStore es el siguiente paso.

---

---

## ✅ fetchProjects optimizado — 20/06/2026

Se separó la query de listado de la query de detalle:

- `fetchProjects` → queries `project_list_view` (liviana, sin JSONB completo)
- `fetchProjectById` → queries `projects` completo (solo cuando se abre un proyecto)
- EditorPage y MobilePreviewPage llaman `fetchProjectById` automáticamente cuando el
  proyecto en store es un summary liviano
- ProjectsPage muestra correctamente conteo de escenas y dancers desde el view

### 🔴 ACCIÓN REQUERIDA: Crear la vista en Supabase SQL Editor

Correr el siguiente SQL en Supabase → SQL Editor:

```sql
-- Vista liviana para el listado de proyectos.
-- Devuelve solo los campos necesarios para las cards, sin traer el JSONB completo.
CREATE OR REPLACE VIEW project_list_view
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  group_name,
  choreography_name,
  stage_ratio,
  stage_width,
  stage_height,
  group_id,
  event_id,
  owner_id,
  share_token,
  share_show_names,
  created_at,
  updated_at,
  -- Conteo real de escenas (sin traer el array completo)
  COALESCE(jsonb_array_length(data -> 'scenes'), 0) AS scene_count,
  -- Total de dancers a través de todas las escenas
  COALESCE(
    (SELECT SUM(jsonb_array_length(COALESCE(s -> 'dancers', '[]'::jsonb)))
     FROM jsonb_array_elements(COALESCE(data -> 'scenes', '[]'::jsonb)) AS s),
    0
  )::int AS dancer_count,
  -- Datos de la primera escena para el thumbnail de la card
  COALESCE(data -> 'scenes' -> 0 -> 'dancers', '[]'::jsonb) AS first_scene_dancers,
  COALESCE(data -> 'scenes' -> 0 ->> 'formationName', '') AS first_scene_formation_name,
  COALESCE(data ->> 'activeSceneId', '') AS active_scene_id
FROM projects;
```

Sin este SQL, el listado `/proyectos` va a fallar (la vista no existe).
El editor sigue funcionando porque usa `fetchProjectById` directo a la tabla `projects`.

---

---

## ⚠️ DECISIÓN DE PRODUCTO PENDIENTE — Límite de integrantes al importar grupo (20/06/2026)

Al crear un proyecto vinculado a un grupo con más integrantes que el límite del plan:

**Comportamiento actual (implementado):** se toman los primeros N integrantes por orden de creación (`.slice(0, limit)`). Free = 10, Pro = 50, Studio = sin límite.

**Decisión pendiente:** ¿Es "los primeros por orden de creación" el criterio correcto? Alternativas:
1. Los primeros por orden de creación ← implementado ahora
2. Los marcados como "capitán" primero, luego el resto
3. El usuario elige manualmente cuáles importar (requiere UI extra)

**También falta:** mostrar un aviso en el modal de creación cuando el grupo tiene más integrantes que el límite del plan, antes de confirmar (actualmente el corte es silencioso).

---

---

## SEO técnico — pendientes y diagnóstico (20/06/2026)

### 🟡 og-image: SVG placeholder, necesita PNG

`public/og-image.svg` es un SVG diseñado con el branding de Crewficina
(fondo oscuro, logo, tagline, pills de features, URL).

**Problema:** WhatsApp, Facebook y la mayoría de las redes sociales NO aceptan
SVG como og:image — requieren JPEG o PNG. Twitter/X sí acepta SVG.

**Acción requerida:** convertir `public/og-image.svg` a `public/og-image.png`
(1200×630px) y actualizar las rutas en `index.html`. Herramientas sugeridas:
- Inkscape CLI: `inkscape og-image.svg --export-type=png -w 1200 -h 630 -o og-image.png`
- Online: svgtopng.com
- Figma/Canva: pegar el SVG y exportar como PNG

Una vez creado el PNG, actualizar en `index.html`:
```
og:image  → https://crewficina.com/og-image.png
twitter:image → https://crewficina.com/og-image.png
```

### 🟡 SPA vs crawlers — diagnóstico

**Situación:** la app es una SPA pura (React + Vite, sin SSR). Vercel sirve
`index.html` para todas las rutas (catch-all en `vercel.json`).

**Impacto en SEO:**
- Google Googlebot SÍ renderiza JavaScript (desde 2014), pero el proceso es
  asíncrono: primero indexa el HTML vacío, luego vuelve a renderizar con JS.
  Esto puede tardar días o semanas para páginas nuevas.
- La landing (`/`) es la única página que debe indexarse; las demás requieren
  login y ya están en `robots.txt` como `Disallow`.
- Para la landing, Google eventualmente verá el contenido React completo.

**Opción de mejora futura (no urgente):**
Implementar SSG solo para la landing usando `vite-plugin-ssg` o `react-snap`.
Esto pre-renderiza la landing como HTML estático, lo que Google ve
inmediatamente. El resto de la app (editor, proyectos) sigue como SPA.
NO implementar hasta que haya señales de que el crawler no está indexando
el contenido de la landing correctamente.

**Para diagnosticar si Google ve el contenido:**
Usar Google Search Console → Inspección de URL → `crewficina.com`
→ "Ver como Googlebot". Si muestra el HTML renderizado de la landing, no hay
problema. Si muestra HTML vacío (`<div id="root"></div>`), hay que considerar SSG.

---

---

## ✅ SESIÓN STUDIO MULTI-USUARIO — Completada 20/06/2026

### Commits de la sesión:
- `0a0a065` — SQL Fase 1: organizations + organization_members + organization_invites + funciones SECURITY DEFINER
- `121b787` — SQL Fase 2: organization_id en members/groups/events/activities + nickname en members + RLS actualizado
- `60fb02e` — TS Fase 3: tipos org + workspaceStore + crewStore org-aware + i18n
- `4e2a81e` — TS Fases 4-6: WorkspaceSwitcher + OrganizacionPage + InvitePage + detección de duplicados

### ⚠️ ACCIÓN REQUERIDA (en orden):
1. Correr `supabase-studio-migration.sql` en Supabase SQL Editor
2. Correr `supabase-studio-rls-migration.sql` en Supabase SQL Editor
3. Deployar (Vercel lo hace automático desde main)

### Decisiones tomadas por Claude sin preguntar:

1. **SECURITY DEFINER functions para crear org y aceptar invite** — el RLS normal tiene
   un problema chicken-and-egg: para insertar en organization_members como admin, el 
   sistema verifica si ya sos admin en esa org. Solución: funciones PG que bypasean RLS.

2. **crewStore lee workspaceStore.getState() internamente** — en vez de que los componentes
   le pasen el workspace a fetchAll. Esto mantiene la API de los componentes sin cambios.

3. **fetchAll en org mode: filtro `organization_id = orgId`; en personal: `owner_id + is(org_id, null)`**
   — asegura que los dos espacios (personal y org) estén completamente separados y no se mezclen.

4. **group_members se filtra por los IDs de grupos ya cargados** (no se hace `select *` ciego) — 
   evita que en modo org aparezcan las membresías de grupos personales y viceversa.

5. **Detección de duplicados solo en contexto org** — en espacio personal no tiene sentido
   (el mismo usuario no cargaría el mismo integrante dos veces con intención).

6. **La página /organizacion muestra formulario de creación si no hay org activa** —
   un mismo usuario puede crear su propia org desde esta página aunque no tenga ninguna aún.

7. **WorkspaceSwitcher en ModuleNav (no en el header del editor)** — el editor (Konva) ya
   tiene su propio header y trabaja sobre projects que son privados por owner. El switcher
   solo importa para Integrantes/Grupos/Eventos, que están en ModuleNav.

### 🔴 Facturación variable de seats (NO implementada — pendiente técnico separado):
Stripe metered billing / variable pricing para seats adicionales ($10/seat sobre los 3 incluidos)
requiere su propia sesión. El campo `extra_seat_price_cents` existe en la tabla `organizations`
para cuando se implemente. La UI de `/organizacion` ya muestra el aviso de costo extra pero
NO procesa cobros reales. Pendiente: integrar Stripe Billing con quantity updates.

### 🟡 Revisión visual pendiente:
- WorkspaceSwitcher en el ModuleNav — verificar que no rompa el scroll horizontal en mobile
- OrganizacionPage: la query de `auth_users:user_id(email)` puede no funcionar con RLS de Supabase
  si auth.users no es accesible desde el cliente anon. Si da error, simplificar mostrando user_id
  en vez de email (o usar una edge function para eso)
- La ruta /invite/:token es pública — confirmar que la política "invites_self_select" 
  permite al usuario logueado ver la invitación ANTES de que supabase.rpc valide el email

### 🟡 Stripe seats pendiente:
- Ver pendiente anterior + agregar webhook para cambiar `included_seats` en `organizations`
  cuando cambia la suscripción. La lógica de pricing variable requiere Stripe Billing items.

---

## Build + Lint
✅ `npm run build` limpio
✅ `npm run lint` limpio (0 warnings)

---

---

## ✅ SESIÓN 21/06/2026 — Auditoría completa + Seguridad backend + Studio features

### Resumen de lo que se construyó

#### Auditoría de plataforma (12 módulos)
- `4ac3850` — fix: rol `viewer` no se aplicaba en el frontend (Integrantes/Grupos/Eventos/Actividades).
  Viewers veían botones de mutación; RLS bloqueaba en backend pero el form cerraba como si
  hubiera funcionado → apariencia de pérdida de datos. Corregido con `canEdit` en todas las páginas crew.
- `e2f9b0a` — fix: usuario deslogueado no podía leer invitación (RLS bloqueaba sin auth.uid).
  Solución: `get_invite_preview(token)` SECURITY DEFINER — accesible para anon+authenticated.
  **⚠️ Requiere correr `supabase-studio-invite-preview.sql`.**

#### Seguridad backend — límite maxDancers
- `3837962` — feat: trigger `enforce_max_dancers` en projects + `get_user_plan()` +
  `validate_max_dancers()`. Refuerza el límite 10/50/∞ en el backend (antes solo era frontend).
  Maneja downgrade de plan: solo bloquea si el máximo AUMENTA, no retroactivamente.
  `saveProject` ahora devuelve `{ error }` y EditorPage muestra banner de error.
  **⚠️ Requiere correr `supabase-maxdancers-trigger.sql`** (ya corrido y confirmado por Diego).

#### Fix bugs post-trigger
- `c1e1f14` — fix: error de guardado mostraba "[object Object]" (PostgrestError no es instanceof Error).
- `8b237d9` — fix: presets del sidebar generaban 12 dancers por defecto (excedía Free).
  Opción A elegida: `applyFormation` recibe `maxCount` y clampea al límite del plan.
  Todos los presets (no solo Diagonal) estaban afectados — compartían `newDancerCount=12`.

#### Feature: eliminar organización
- `019296c` — SQL: `delete_organization()` + constraints ON DELETE CASCADE (members/groups/events/activities)
  + ON DELETE SET NULL (projects.event_id, projects.group_id).
  **⚠️ Requiere correr `supabase-delete-organization.sql`.**
- `592d100` — UI: Zona de peligro en `/organizacion` (solo admins). Modal estilo GitHub que exige
  escribir el nombre exacto de la org para habilitar el botón destructivo. Al confirmar:
  switchToPersonal + loadMemberships + redirect a `/projects`.

#### Fix urgente: crear org requiere Studio
- `47aa665` — fix: `/organizacion` nunca estuvo plan-gateado → cualquier Free podía crear una org.
  Frontend: UpgradeGate (con loading guard para evitar flash). Backend: `create_organization()`
  verifica `get_user_plan() = 'studio'` al principio.
  **⚠️ Requiere correr `supabase-org-requires-studio.sql`.**

---

### SQL pendientes de correr (ver PENDIENTES-SQL.md para instrucciones completas)

| Archivo | Estado | Impacto si no se corre |
|---|---|---|
| `supabase-studio-invite-preview.sql` | 🔴 PENDIENTE | Invitados sin cuenta ven "inválida" en lugar de login |
| `supabase-delete-organization.sql` | 🔴 PENDIENTE | Botón eliminar org falla (función no existe) |
| `supabase-org-requires-studio.sql` | 🔴 PENDIENTE | Cualquier Free puede crear org vía API directa |

Orden recomendado: invite-preview → delete-organization → org-requires-studio.
Ver `PENDIENTES-SQL.md` para el contenido completo de cada uno, dependencias y query de verificación.

---

### Decisiones de producto pendientes (de la auditoría)

**A. Límites de plan solo en frontend (seguridad parcial)**
- maxDancers ya tiene refuerzo backend (trigger). ✅
- maxProjects (2 para Free) sigue solo en frontend. Nota previa: NO tocar hasta 31/12/2026.
- Gates de Reportes/Audio/Actividades son de monetización, no fuga de datos — aceptable.

**B. "Bailarín" vs "integrante" en el editor**
Quedan usos de "bailarín" en: DancerPropertiesPanel, KeyboardShortcutsModal, TutorialOverlay,
LevelSelector, Sidebar. Los usos en el testimonial de la landing y en los tags de persona
("Juez, Bailarín, Docente") son intencionales y no deben cambiarse.
¿Querés unificar a "integrante" en los componentes del editor solamente?

**C. includedSeats hardcodeado en 3**
`OrganizacionPage` usa `const includedSeats = 3`. La tabla `organizations` tiene la columna
`included_seats`. Trivial de cambiar, pero sin facturación variable no tiene efecto práctico.

**D. Facturación variable de seats Studio**
`extra_seat_price_cents` existe en la tabla. La UI ya muestra el aviso pero no cobra.
Pendiente de sesión separada con Stripe metered billing.

---

*Sesión completada — 21/06/2026*
