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

// Devuelve la clave i18n del primer error, o null si validó OK.
export function firstErrorKey(result: { success: boolean; error?: z.ZodError }): string | null {
  if (result.success) return null
  return result.error?.issues[0]?.message ?? 'validation.invalid'
}
