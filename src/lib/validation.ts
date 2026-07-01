import { z } from 'zod'

// Esquemas de validación de inputs críticos. Los mensajes son CLAVES i18n
// (namespace `validation.*`); se traducen en el componente con t(...) para
// mostrarlos en el idioma del usuario.

export const registerSchema = z.object({
  email: z.string().email('validation.email_invalid'),
  password: z.string().min(8, 'validation.password_min').max(100, 'validation.password_max'),
})

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'validation.name_required').max(100, 'validation.name_max'),
})

export const memberSchema = z.object({
  name: z.string().trim().min(1, 'validation.name_required').max(100, 'validation.name_max'),
  nickname: z.string().trim().max(50, 'validation.nickname_max').optional(),
})

// Nombre genérico (grupos y eventos).
export const nameSchema = z.object({
  name: z.string().trim().min(1, 'validation.name_required').max(100, 'validation.name_max'),
})

// Email suelto (invitaciones a organización).
export const emailSchema = z.string().trim().email('validation.email_invalid')

// Nombre de organización — mismo patrón que nameSchema (valor suelto).
export const orgNameSchema = z.string().trim().min(1, 'validation.name_required').max(100, 'validation.name_max')

// Ítem de checklist / actividad.
export const checklistItemSchema = z.string().trim().min(1, 'validation.name_required').max(150, 'validation.checklist_max')

// Ubicación de evento (opcional; el componente sólo valida si hay valor).
export const locationSchema = z.string().trim().max(200, 'validation.location_max')

// Fecha de evento YYYY-MM-DD: formato válido, día real, entre 2020 y +5 años.
export const eventDateSchema = z.string()
  .refine(v => /^\d{4}-\d{2}-\d{2}$/.test(v), 'validation.date_invalid')
  .refine(v => {
    const [y, m, d] = v.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const realDate = dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
    const maxYear = new Date().getFullYear() + 5
    return realDate && y >= 2020 && y <= maxYear
  }, 'validation.date_range')

// Devuelve la clave i18n del primer error, o null si validó OK.
export function firstErrorKey(result: { success: boolean; error?: z.ZodError }): string | null {
  if (result.success) return null
  return result.error?.issues[0]?.message ?? 'validation.invalid'
}
