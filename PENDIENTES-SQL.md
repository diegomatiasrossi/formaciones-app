# SQL pendientes de correr en Supabase

**Estado:** Working tree limpio al 21/06/2026. Todo el código está en `origin/main`.  
**Dónde correr:** Supabase Dashboard → SQL Editor → New query → pegar → Run.

---

## ✅ Ya corridos (no volver a correr)

| Archivo | Qué hace | Confirmado por |
|---|---|---|
| `supabase-modules-migration.sql` | Tablas members/groups/group_members/events/activities + RLS owner | Módulos funcionando en producción |
| `supabase-custom-stage-migration.sql` | Columnas stage_width/stage_height en projects | Editor con ratio custom funciona |
| `supabase-stripe-migration.sql` | Columnas billing en user_plans | Plan detection funciona |
| `supabase-studio-migration.sql` | Tablas organizations/org_members/org_invites + is_org_admin + create_organization + accept_org_invite | Organización "Póleo Enterprise" creada y visible |
| `supabase-studio-rls-migration.sql` | Columna organization_id en members/groups/events/activities + RLS con org support | Corrido (causó 500 → aplicado el hotfix) |
| `supabase-studio-rls-hotfix.sql` | Fix recursión RLS → función is_org_admin (SECURITY DEFINER) | 500 resueltos, tablas responden |
| `supabase-maxdancers-trigger.sql` | get_user_plan + trigger enforce_max_dancers en projects | Diego confirmó: 12 dancers bloqueados para Free |

---

## 🔴 PENDIENTES — Correr en este orden

### PASO 1 — `supabase-studio-invite-preview.sql`
**Qué hace:** crea `get_invite_preview(token)` — función SECURITY DEFINER que permite
que un usuario DESLOGUEADO (el caso típico de un profe nuevo que abre un link de
invitación) pueda ver el preview de la invitación. Sin esto, la página `/invite/:token`
muestra "invitación inválida" para cualquier persona que no esté ya logueada.

**Dependencias:** ninguna nueva (solo requiere la tabla `organization_invites`,
ya creada en `supabase-studio-migration.sql` ✅).

**Sin esta función:** el flujo de invitación está parcialmente roto para el caso
principal (profe nuevo que no tiene cuenta aún).

---

### PASO 2 — `supabase-delete-organization.sql`
**Qué hace:**
1. Cambia las FK de `members/groups/events/activities.organization_id` a **ON DELETE CASCADE**
   (al borrar una org, se borran todos sus datos compartidos)
2. Cambia `projects.event_id` y `projects.group_id` a **ON DELETE SET NULL**
   (al borrar un evento/grupo de org, el proyecto del usuario sobrevive sin la referencia)
3. Crea `delete_organization(org_id)` — función SECURITY DEFINER que solo admins pueden llamar

**Dependencias:** requiere `is_org_admin(uuid)` (creada en `supabase-studio-rls-hotfix.sql` ✅).

**Sin este SQL:** el botón "Eliminar organización" en `/organizacion` falla porque
la función no existe en el backend.

**Nota:** los bloques DO del paso 1 y 2 buscan los nombres reales de las FK
dinámicamente — son idempotentes y no requieren conocer nombres hardcodeados.

---

### PASO 3 — `supabase-org-requires-studio.sql`
**Qué hace:** reemplaza `create_organization()` agregando un chequeo de plan al
principio: solo usuarios Studio (o el owner via bypass de email) pueden crear una org.
Sin este chequeo, cualquier usuario Free puede crear organizaciones y acceder a toda
la funcionalidad Studio sin pagar.

**Dependencias:** requiere `get_user_plan(uuid)` (creada en `supabase-maxdancers-trigger.sql` ✅).

**Sin este SQL:** el gate de frontend protege la UI, pero alguien con conocimientos
técnicos puede llamar el RPC directamente y crear una org siendo Free.

---

## Verificación después de correr los 3 pasos

```sql
-- Confirmar que las 3 funciones existen:
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_invite_preview',
    'delete_organization',
    'create_organization',
    'get_user_plan',
    'is_org_admin'
  )
order by routine_name;
-- Debe devolver 5 filas.

-- Confirmar acciones ON DELETE de las FK críticas:
select conrelid::regclass as tabla, conname, confdeltype
from pg_constraint
where contype = 'f'
  and conrelid::regclass::text in ('members','groups','events','activities','projects')
  and confrelid::regclass::text in ('organizations','events','groups')
order by tabla;
-- members/groups/events/activities → organizations: confdeltype = 'c' (cascade)
-- projects → events, projects → groups: confdeltype = 'n' (set null)
```

---

## Orden de ejecución resumido

```
PASO 1: supabase-studio-invite-preview.sql   (independiente)
PASO 2: supabase-delete-organization.sql     (requiere is_org_admin ✅ ya existe)
PASO 3: supabase-org-requires-studio.sql     (requiere get_user_plan ✅ ya existe)
```

Los 3 pasos son independientes entre sí — pueden correrse en cualquier orden
entre ellos. El orden 1→2→3 es el recomendado por impacto: primero el que
arregla algo roto (invitaciones), después el que habilita algo nuevo (eliminar org),
después el que cierra el agujero de seguridad (org requiere Studio).

---

*Documento generado 21/06/2026 — actualizar cada vez que se corra un paso.*
