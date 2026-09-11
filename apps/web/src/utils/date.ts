/** Today's date as an ISO string (yyyy-mm-dd), in the browser's local timezone-naive form
 * used throughout the app for date inputs and comparisons. */
export const todayISO = (): string => new Date().toISOString().slice(0, 10)

/** Edad en años cumplidos para una fecha de nacimiento ISO, calculada a la fecha `at` (0 sin fecha). */
export function ageFromBirthDate(birthDate: string | undefined, at: Date = new Date()): number {
  if (!birthDate) return 0
  const birth = new Date(`${birthDate}T00:00:00`)
  let age = at.getFullYear() - birth.getFullYear()
  const m = at.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age--
  return age > 0 ? age : 0
}

/** Días entre dos fechas ISO (yyyy-mm-dd); null si falta alguna o el rango es negativo. */
export function daysBetween(from: string | undefined, to: string | undefined): number | null {
  if (!from || !to) return null
  const days = Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000)
  return Number.isFinite(days) && days >= 0 ? days : null
}

// ---------------------------------------------------------------------------
// ISO week helpers (weeks run Monday → Sunday, matching the center's checklist)
//
// These build dates with the local-time `Date(y, m, d)` constructor and format
// them by hand rather than via `toISOString()`, which shifts to UTC and can slide
// a date across midnight for anyone west of Greenwich.
// ---------------------------------------------------------------------------

/** Local `YYYY-MM-DD` for a Date, with no UTC shift. */
export function toLocalISODate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** The Monday of the week containing `d`, at local midnight. */
function mondayOf(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // getDay(): 0 = Sunday. Sunday belongs to the week that started 6 days earlier.
  const offset = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - offset)
  return out
}

/** ISO week id for a date, e.g. `'2026-W35'`. */
export function weekIdOf(date: Date | string = new Date()): string {
  const base = typeof date === 'string' ? new Date(`${date}T00:00:00`) : date
  const monday = mondayOf(base)
  // ISO rule: the week's year is the year of its Thursday.
  const thursday = new Date(monday)
  thursday.setDate(thursday.getDate() + 3)
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  const week =
    1 + Math.round((mondayOf(thursday).getTime() - mondayOf(firstThursday).getTime()) / (7 * 86400000))
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

/** The Monday of a week id, at local midnight. */
function mondayOfWeekId(weekId: string): Date {
  const [yearPart, weekPart] = weekId.split('-W')
  const year = Number(yearPart)
  const week = Number(weekPart)
  // Jan 4th is always in ISO week 1.
  const monday = mondayOf(new Date(year, 0, 4))
  monday.setDate(monday.getDate() + (week - 1) * 7)
  return monday
}

/** The 7 dates (`YYYY-MM-DD`, Monday → Sunday) of a week id. */
export function weekDatesOf(weekId: string): string[] {
  const monday = mondayOfWeekId(weekId)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return toLocalISODate(d)
  })
}

/** Move a week id forward (`+1`) or back (`-1`) by whole weeks. */
export function shiftWeek(weekId: string, delta: number): string {
  const monday = mondayOfWeekId(weekId)
  monday.setDate(monday.getDate() + delta * 7)
  return weekIdOf(monday)
}

/** Human label for a week, e.g. `'24 al 30 de agosto de 2026'`. */
export function formatWeekRange(weekId: string): string {
  const dates = weekDatesOf(weekId)
  const start = new Date(`${dates[0]}T00:00:00`)
  const end = new Date(`${dates[6]}T00:00:00`)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startText = sameMonth
    ? String(start.getDate())
    : start.toLocaleDateString('es', { day: 'numeric', month: 'long' })
  const endText = end.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startText} al ${endText}`
}

/**
 * Formats a Firestore `createdAt`/`updatedAt`-style value for display.
 *
 * These fields are written with `serverTimestamp()` (see `saveDoc`/`updateDocHelper`
 * in `firebase/firestore.ts`), so at runtime they're a Firestore `Timestamp` —
 * never the `string` some domain types optimistically declare. Rendering one
 * directly crashes React (#31: "objects are not valid as a React child"). This
 * is the one place that should know how to turn that value into text; handles
 * a live `Timestamp` (has `.toDate()`), a plain `{seconds, nanoseconds}` object
 * (what survives a JSON round-trip, e.g. a restored backup), and an already-ISO
 * string — anything else, including `null`/`undefined`, returns `fallback`.
 */
export function formatTimestamp(value: unknown, fallback = '—', withTime = false): string {
  if (value == null) return fallback

  let date: Date | null = null
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    date = (value as { toDate: () => Date }).toDate()
  } else if (typeof value === 'object' && 'seconds' in value) {
    const seconds = (value as { seconds: unknown }).seconds
    if (typeof seconds === 'number') date = new Date(seconds * 1000)
  } else if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) date = parsed
  }

  if (!date || Number.isNaN(date.getTime())) return fallback
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  if (withTime) {
    opts.hour = '2-digit'
    opts.minute = '2-digit'
  }
  return date.toLocaleDateString('es', opts)
}
