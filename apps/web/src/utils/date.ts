/** Today's date as an ISO string (yyyy-mm-dd), in the browser's local timezone-naive form
 * used throughout the app for date inputs and comparisons. */
export const todayISO = (): string => new Date().toISOString().slice(0, 10)
