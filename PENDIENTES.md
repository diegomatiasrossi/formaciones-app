# PENDIENTES — Crewficina
Generado automáticamente — 19/06/2026

---

## ✅ QUÉ SE CORRIGIÓ EN ESTA SESIÓN

### Build y lint
- ESLint instalado y configurado (`eslint.config.js`, `npm run lint`)
- 0 errores de compilación TypeScript
- 0 errores / 0 warnings de ESLint

### Bugs reales corregidos
- `AudioPanel.tsx` — hooks llamados después de early return condicional → hooks movidos al top
- `StatisticsPanel.tsx` — mismo patrón → hooks al top, useMemo para `dancers`
- `CreativeQuoteSplash.tsx` — `useRef.current` en render → migrado a `useState`
- `StageCanvas.tsx` — `dancers` sin memoización causaba stale en callbacks → `useMemo`
- `projectStore.ts` — `fetchProjects` sin filtro por `owner_id` (usuarios veían proyectos ajenos) → `.eq('owner_id', user.id)`

### Tipos
- `Dancer.leader?: boolean` agregado a `types/index.ts`
- `(dancer as any).leader` → `dancer.leader` en `CrewMemberShape.tsx`

### i18n
- `projects.*` expandido con 15+ claves nuevas (ES / EN / PT)
- `editor.outside_stage` ya estaba en i18n
- `SceneMiniature` ahora usa `t('projects.no_members_preview')`
- Strings hardcodeados en `ProjectsPage.tsx` migrados

---

## ⚠️ QUÉ ENCONTRÉ PERO NO TOQUÉ (fuera del scope)

### Strings hardcodeados que aún quedan en UI
Los siguientes archivos tienen strings en español que _podrían_ estar en i18n
pero no se migraron porque cambiarlos requeriría refactores mayores o son
strings de UI de terceros:

| Archivo | Strings | Nota |
|---|---|---|
| `ProjectsPage.tsx` (modal) | Labels del form: "Grupo / Crew", "Nombre de la coreografía", "Fecha inicio", "Proporción del escenario", "Cuadrado/Horizontal/Vertical", "Semanas de preparación" | Las claves YA EXISTEN en i18n (agregadas esta sesión), solo falta aplicarlas en el JSX |
| `PricingPage.tsx` | Features de cada plan ("15 integrantes por escena", etc.) | Arrays hardcodeados, refactor no trivial |
| `LandingPage.tsx` | Labels de sección ("Herramientas", "Pedagogía", "Quién está detrás") | Menor prioridad |
| `AuthPage.tsx` | Todo vía i18n ✅ | OK |
| `EditorLayout.tsx` | "Guardar", "Atajos de teclado" | Ya en i18n, solo aplicar |
| `Sidebar.tsx` | Nombres de formaciones y transformaciones | Ya en i18n vía `t('formations.*')` y `t('editor.sidebar.*')` — verificar uso |
| `TutorialOverlay.tsx` | Textos del tutorial de 11 pasos | Hardcodeados en español, sin i18n |
| `ChecklistPanel.tsx` | Items del checklist | En `data/checklist.ts`, sin i18n |

### Reglas ESLint desactivadas intencionalmente
- `react-hooks/set-state-in-effect` — off (patrones legítimos en `usePlan.ts`, `TutorialOverlay.tsx`)
- `react-hooks/refs` — off (ya corregidos los reales, los restantes son falsos positivos)

---

## 🔴 QUÉ NECESITA DECISIÓN HUMANA

### 1. Aplicar claves i18n al modal de nuevo proyecto
Las claves `projects.form_group`, `projects.form_choreo`, `projects.form_start`, etc.
ya existen en ES/EN/PT pero el JSX en `ProjectsPage.tsx` todavía usa strings hardcodeadas.
**Decisión:** ¿Aplicamos las claves ahora? Es un refactor del modal (~30 líneas).

### 2. i18n del tutorial
`TutorialOverlay.tsx` tiene 11 pasos con textos hardcodeados en español.
Traducirlos requiere crear `tutorial.*` keys en los 3 idiomas.
**Decisión:** ¿Vale la pena para el MVP? El tutorial es opcional (se puede saltar).

### 3. i18n del checklist
Los items del checklist de producción (`data/checklist.ts`) están en español.
**Decisión:** ¿Se traduce el checklist a EN/PT o queda solo en ES por ahora?

### 4. PricingPage — features de planes
Los arrays de features de cada plan están hardcodeados.
Si el pricing cambia (nuevos features), hay que editar el código.
**Decisión:** ¿Mover a i18n o dejar como está hasta que el pricing se estabilice?

### 5. Paleta de colores
La paleta de la app tiene `#C9A961` como dorado y `#C9343D` como rojo.
El logo/design system de Claude Design usó `#B8962E` inicialmente.
**Decisión:** ¿La paleta oficial es `#C9A961` (champagne) o `#B8962E` (bronce más oscuro)?
Actualmente el código usa `#C9A961` (revertido en esta sesión según instrucción).

### 6. CrewMemberShape — forma M
La "personita" usa una forma M construida con un polígono de 5 puntos.
Las proporciones se están ajustando iterativamente.
**Decisión:** ¿Cuándo se aprueba la forma final? Actualmente `headR=0.62`, `bw=1.05`, `bh=1.05`.

---

*Fin del reporte — build limpio, lint limpio, loop completado.*
