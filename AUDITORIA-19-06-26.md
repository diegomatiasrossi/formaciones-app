# Auditoría completa — Crewficina (sesión 19/06, ejecutada 21/06/2026)

> Recorrido completo de los 12 módulos. NO se detuvo por límite de uso —
> se auditaron todos los módulos del 1 al 12. Profundidad variable según
> riesgo (ver "Cobertura" al final).

Estado git al iniciar: working tree limpio, todo pusheado (`origin/main` =
`21969a8`). Esto se verificó ANTES de empezar, como pide la metodología.

---

## Bugs encontrados y arreglados

### 1. [Organización] Rol `viewer` no se aplicaba en el frontend — UX de pérdida de datos
**Módulo:** 9 (Organización) + 4/5/6/7 (Integrantes, Grupos, Eventos, Actividades)
**Bug:** El rol `viewer` existía en el type, i18n y los dropdowns, pero NUNCA
se chequeaba en la UI. Un viewer en una organización veía todos los botones
de crear/editar/eliminar. La RLS del backend SÍ rechaza sus mutaciones
(las políticas exigen admin/editor), pero el frontend cerraba el formulario
como si la acción hubiera funcionado → el registro "desaparecía" en el
siguiente fetch, pareciendo pérdida de datos.
**Fix:** `canEdit = espacio personal OR rol in (admin, editor)`. Se ocultan
los botones de mutación y se agregó guard en los handlers de IntegrantesPage,
GruposPage, EventosPage y ActivitiesPanel. El viewer mantiene acceso de
lectura completo. Es defensa en profundidad sobre la RLS (que sigue siendo
la barrera real de seguridad), no la reemplaza.
**Commit:** `4ac3850`

### 2. [Organización] Usuario deslogueado no podía leer la invitación
**Módulo:** 9 (flujo de aceptar invitación)
**Bug:** Las políticas RLS de `organization_invites` requieren todas
`auth.uid()`. Un usuario DESLOGUEADO que abre un link de invitación (el caso
típico de un profe nuevo) no podía leer la fila → InvitePage caía en el
estado 'invalid' en vez de 'needs_login'. El flujo de invitación estaba roto
para cualquiera que no estuviera ya logueado.
**Fix:** Nueva función `SECURITY DEFINER get_invite_preview(token)` (en
`supabase-studio-invite-preview.sql`) que devuelve el preview de una
invitación válida a anon + authenticated. InvitePage la usa primero, con
fallback al query directo si la función no está deployada (no rompe nada
mientras tanto).
**Commit:** `e2f9b0a`
**⚠️ ACCIÓN REQUERIDA:** correr `supabase-studio-invite-preview.sql` en Supabase.

---

## Cosas que necesitan decisión de Diego

### A. [Planes — SEGURIDAD] Límites de plan validados solo en frontend
**Situación:** Los límites de plan se aplican únicamente en React, no hay
refuerzo en el backend (RLS/funciones):
- **Límite de integrantes en canvas (10/50/∞):** solo lo aplica `Toolbar.tsx`.
  Los "dancers" viven dentro de `projects.data` (JSONB); la RLS solo valida
  `owner_id`. Un usuario técnico (DevTools / API directa) podría guardar un
  proyecto con más dancers de los que su plan permite.
- **Cantidad de proyectos en Free (2):** solo lo aplica `usePlan.canCreateProject`.
  Un usuario técnico podría insertar más vía API.
- **Reportes / Actividades / Audio / Canon:** son gates de *visibilidad de
  feature* (monetización), no de protección de datos — un Free que los saltee
  solo accede a una feature premium sobre SUS PROPIOS datos (que la RLS ya le
  deja leer). No es una fuga de datos, pero sí un bypass de monetización.

**Pregunta:** ¿Querés reforzar estos límites en el backend? Opciones:
1. **maxProjects:** se puede hacer con una política RLS de INSERT que cuente
   filas existentes del owner. Relativamente simple. (Nota: en un prompt
   anterior se pidió NO tocar el límite de proyectos Free porque tiene fecha
   de vencimiento 31/12/2026 — por eso NO lo toqué.)
3. **maxDancers:** requiere un trigger que cuente `data->scenes->dancers` en
   cada UPDATE de projects. Más complejo y frágil. Es "repensar arquitectura"
   → por eso lo documento en vez de implementarlo.
4. **Feature gates (reportes/audio/etc.):** como no son fuga de datos, quizás
   no valga la pena reforzarlos en backend. Decisión de negocio.

### B. [Terminología] "bailarín" vs "integrante" en varios lugares
**Situación:** Quedan usos de "bailarín/bailarines" en UI: `DancerPropertiesPanel`
("Bailarín"), `KeyboardShortcutsModal`, `TutorialOverlay`, `LevelSelector`,
`Sidebar`. NO los cambié porque hay ambigüedad: en el testimonial de la
landing ("soy juez... y bailarín") y en los tags de persona ("Juez,
Bailarín, Docente") la palabra es correcta (describe personas reales), y en
`quotes.ts` ("El espacio es tu primer bailarín") es una frase poética
intencional.
**Pregunta:** ¿Querés unificar a "integrante" en TODA la UI del editor
(propiedades, tutorial, atajos, niveles, sidebar), dejando intactos el
testimonial, los tags de persona y las frases poéticas? Si confirmás, es un
cambio cosmético rápido.

### C. [Organización] `includedSeats` hardcodeado en 3
**Situación:** `OrganizacionPage` usa `const includedSeats = 3` hardcodeado,
con comentario "from org settings — simplified". La tabla `organizations`
tiene la columna `included_seats`. Hoy funciona porque el default es 3.
**Pregunta:** ¿Lo dejamos así hasta implementar la facturación variable de
seats (ya documentada como pendiente técnico), o querés que lea el valor real
de la org ahora? Es trivial de cambiar, pero sin facturación variable no tiene
efecto práctico todavía.

### D. [Organización] No hay forma de eliminar una organización desde la UI
**Situación:** Diego terminó con 2 orgs por error ("Póleo Enterprise" y "2da
organizacion") durante el debug. No existe botón de eliminar org en
`/organizacion`.
**Pregunta:** ¿Agregamos un botón "Eliminar organización" (solo admin, con
confirmación)? Por ahora se puede borrar manual en Supabase:
`delete from organizations where name = '2da organizacion';`
(el `on delete cascade` limpia members, invites y desvincula el resto).

---

## Verificaciones que dieron OK (sin bugs)

- **RLS recursión (módulo 9/10):** confirmado que el hotfix `is_org_admin`
  (SECURITY DEFINER) resolvió la recursión. Las políticas de las tablas crew
  hacen subquery a `organization_members`, cuyas políticas usan `is_org_admin`
  (que bypasea RLS) → no hay loop. ✓
- **ReportesPage gate por URL (módulo 8/10):** gatea a nivel de render
  (`{!can('reportsEnabled') && <UpgradeGate/>}` + `{can(...) && <main/>}`).
  Entrar por URL directa muestra el UpgradeGate igual. ✓
- **PricingPage (módulo 10):** alineado al modelo de 3 planes
  (free / solo_pro / studio). Sin referencias al modelo viejo de 4 planes. ✓
- **Filtrado por workspace (módulo 9):** `crewStore.fetchAll` filtra por
  `organization_id` (org) o `owner_id + is null` (personal). Las 3 páginas
  crew tienen `activeOrgId` en deps de useEffect → re-fetch al cambiar de
  espacio. ✓ (fix de la sesión anterior, `21969a8`, verificado correcto)
- **Invitación con token vencido (módulo 9):** el query filtra
  `.gt('expires_at', now)` y `.is('accepted_at', null)`; un token vencido o
  ya aceptado cae correctamente en 'invalid'. ✓
- **Proyectos son personales (módulo 3):** `fetchProjects` filtra solo por
  `owner_id`, no cambia con el workspace. Es el comportamiento correcto por
  diseño; se agregó nota aclaratoria en la UI en la sesión anterior. ✓
- **WorkspaceSwitcher overflow (módulo 9):** el dropdown ya no queda clipeado
  (fix `bcc2096`, está fuera del contenedor `overflow-x-auto`). ✓
- **i18n estructura (módulo 12):** ES/EN/PT tienen las mismas keys en `org.*`,
  `plan.*`, `activities.*`. El selector de idioma persiste en localStorage
  (`i18n/index.ts`). ✓

---

## Cobertura por módulo

| # | Módulo | Profundidad | Resultado |
|---|--------|-------------|-----------|
| 1 | Landing pública | Media (grep + lectura parcial) | sin bugs nuevos |
| 2 | Auth | Media (AuthPage + useAuth) | sin bugs nuevos |
| 3 | Editor / Espacio | Media | sin bugs nuevos; MembersPanel viejo (JSONB) ya documentado en PENDIENTES |
| 4 | Integrantes | Alta | bug viewer ARREGLADO |
| 5 | Grupos | Alta | bug viewer ARREGLADO |
| 6 | Eventos | Alta | bug viewer ARREGLADO |
| 7 | Actividades | Alta | bug viewer ARREGLADO |
| 8 | Reportes | Alta | OK (gate por URL correcto) |
| 9 | Organización | Alta | 2 bugs ARREGLADOS + 3 decisiones |
| 10 | Planes/restricciones | Alta | decisión de seguridad documentada (A) |
| 11 | Privacidad/cookies | Baja (no se encontraron señales de problema) | sin bugs nuevos |
| 12 | i18n | Media | OK estructura; decisión terminología (B) |

---

## Resumen de commits de esta auditoría
- `4ac3850` — fix: viewer role gating (UX, defensa sobre RLS)
- `e2f9b0a` — fix: invite preview para deslogueados (+ SQL nuevo)

**SQL pendiente de correr en Supabase:** `supabase-studio-invite-preview.sql`

*Auditoría generada el 21/06/2026.*
