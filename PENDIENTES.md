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

## Build + Lint
✅ `npm run build` limpio
✅ `npm run lint` limpio (0 warnings)

---

*Sesión grande completada — 20/06/2026*
