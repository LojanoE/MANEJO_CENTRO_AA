/**
 * Bitácora del profesional: lo que hace fuera de las consultas — reuniones,
 * capacitaciones, visitas domiciliarias, llamadas, gestiones. Vive en la
 * colección `workLogs` y se muestra e imprime junto al Resumen Semanal de su
 * autor (`modules/reports/WeeklyReport.tsx`).
 *
 * ⚠️ No confundir con `ActivityEntry` (`types/activity.ts`): eso es el registro
 * de auditoría automático del sistema (colección `activityLog`, el panel
 * "Actividad Reciente" del Dashboard). Esto lo escribe el profesional a mano.
 */
export interface WorkLogEntry {
  id: string
  /** Auth uid de quien la registró — el mismo que `Attention.authorUid`. */
  authorId: string | null
  authorName: string | null
  /** yyyy-mm-dd: la fecha de la actividad, no la de captura. */
  date: string
  /** Tipo de actividad, texto libre ("Reunión de equipo", "Capacitación"...). */
  activity: string
  /** Paciente relacionado, si la actividad tiene que ver con uno. */
  patientId?: string | null
  patientName?: string | null
  description: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewWorkLogEntry = Omit<WorkLogEntry, 'id'>

/** Lo que llena el formulario; el autor y el nombre del paciente se resuelven al guardar. */
export type WorkLogInput = Omit<NewWorkLogEntry, 'authorId' | 'authorName' | 'patientName' | 'createdAt' | 'updatedAt'>
