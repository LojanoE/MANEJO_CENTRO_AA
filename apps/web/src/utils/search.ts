export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** `true` si la búsqueda está vacía o algún campo la contiene (sin mayúsculas ni tildes). */
export function matchesQuery(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const q = normalizeText(query)
  if (!q) return true
  return fields.some((f) => f != null && normalizeText(String(f)).includes(q))
}
