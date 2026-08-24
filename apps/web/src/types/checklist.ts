/**
 * Checklist semanal del centro (actividades diarias + limpieza de áreas).
 *
 * Reemplaza el Excel impreso "Checklist Semanal CETAD Alma y Vida": una plantilla
 * de filas (`checklistItems`) por 7 columnas de días, donde el personal marca las
 * casillas cumplidas. Cada marca vive como un doc en `checklistMarks`.
 *
 * Nota: el nombre de este archivo NO es `activity.ts` a propósito — ese ya existe
 * y corresponde al log de auditoría (`ActivityEntry`).
 */

export type ChecklistSection = 'Actividades' | 'Limpieza'

export type WeekdayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom'

/** Lunes → domingo, el mismo orden de columnas del Excel original. */
export const WEEKDAYS: WeekdayKey[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
}

export const WEEKDAY_SHORT: Record<WeekdayKey, string> = {
  lun: 'Lun',
  mar: 'Mar',
  mie: 'Mié',
  jue: 'Jue',
  vie: 'Vie',
  sab: 'Sáb',
  dom: 'Dom',
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = ['Actividades', 'Limpieza']

/** Una fila de la plantilla: una actividad diaria o un área de limpieza. */
export interface ChecklistItem {
  id: string
  section: ChecklistSection
  /** Ej: 'Terapia - Marco Ramírez' o 'Baños'. */
  label: string
  /** 'HH:mm'. Opcional — hay filas sin horario definido (ej. Cena). */
  startTime?: string | null
  endTime?: string | null
  /** Texto plano; no se vincula a usuarios ni a `professionals`. */
  responsible?: string | null
  /** Días en que aplica; en el resto la celda se pinta '—'. */
  days: WeekdayKey[]
  /** Orden de la fila dentro de su sección. */
  order: number
  /** Permite retirar una fila sin borrar el historial de marcas. */
  active: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export type ChecklistItemInput = Omit<ChecklistItem, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Una casilla marcada. Solo existen documentos de casillas marcadas: desmarcar
 * borra el doc, de modo que una semana en blanco no escribe nada.
 */
export interface ChecklistMark {
  id: string
  /** Semana ISO, ej. '2026-W35'. */
  weekId: string
  itemId: string
  day: WeekdayKey
  /** Fecha real de ese día ('YYYY-MM-DD'), útil para reportes posteriores. */
  date: string
  byId: string | null
  byName: string | null
  /** ISO timestamp del momento en que se marcó. */
  at: string
  createdAt?: unknown
  updatedAt?: unknown
}

/** Id determinístico para que marcar dos veces no duplique el registro. */
export function markId(weekId: string, itemId: string, day: WeekdayKey): string {
  return `${weekId}_${itemId}_${day}`
}
