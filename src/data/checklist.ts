import type { ChecklistItem } from '@/types'

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'cl-01', label: 'Definir concepto y tema', done: false },
  { id: 'cl-02', label: 'Seleccionar la música', done: false },
  { id: 'cl-03', label: 'Casting y distribución de roles', done: false },
  { id: 'cl-04', label: 'Diseñar formaciones en el canvas', done: false },
  { id: 'cl-05', label: 'Ensayo por secciones', done: false },
  { id: 'cl-06', label: 'Ensayo general completo', done: false },
  { id: 'cl-07', label: 'Vestuario y caracterización', done: false },
  { id: 'cl-08', label: 'Logística de traslado', done: false },
  { id: 'cl-09', label: 'Inscripción / registro en el evento', done: false },
  { id: 'cl-10', label: 'Revisión técnica final', done: false },
]

// Presets específicos para eventos con viaje / competencias internacionales.
// Se ofrecen como categoría separada en el selector de tareas sugeridas.
export const TRAVEL_CHECKLIST: ChecklistItem[] = [
  { id: 'tv-01', label: 'Visa y pasaporte de todos los integrantes', done: false },
  { id: 'tv-02', label: 'Autorización de menores (si aplica)', done: false },
  { id: 'tv-03', label: 'Certificados médicos', done: false },
  { id: 'tv-04', label: 'Cartas de recomendación', done: false },
  { id: 'tv-05', label: 'Seguros de viaje', done: false },
  { id: 'tv-06', label: 'Bandera del país/región', done: false },
  { id: 'tv-07', label: 'Copia del tema musical en drive compartido', done: false },
  { id: 'tv-08', label: 'Ensayo con público (prueba de escenario)', done: false },
  { id: 'tv-09', label: 'Prueba de escenario en la competencia', done: false },
  { id: 'tv-10', label: 'Ensayo individual por integrante', done: false },
]
