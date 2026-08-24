/** Today's date as an ISO string (yyyy-mm-dd), in the browser's local timezone-naive form
 * used throughout the app for date inputs and comparisons. */
export const todayISO = (): string => new Date().toISOString().slice(0, 10)

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
