/** Generador de IDs únicos — sin dependencia externa para el MVP. */
export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
