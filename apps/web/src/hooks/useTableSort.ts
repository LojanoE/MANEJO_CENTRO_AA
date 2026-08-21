import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

/**
 * Client-side sort for a table — sorts whatever rows are already loaded, it never
 * queries Firestore. That matters: an `orderBy()` on the query would silently drop
 * any document missing that field, which we can't rule out for older records.
 */
export function useTableSort<T>(items: T[], initialKey: keyof T | null = null, initialDir: SortDirection = 'asc') {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialKey)
  const [sortDir, setSortDir] = useState<SortDirection>(initialDir)

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items
    const copy = [...items]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv), 'es', { numeric: true })
    })
    if (sortDir === 'desc') copy.reverse()
    return copy
  }, [items, sortKey, sortDir])

  return { sorted, sortKey, sortDir, toggleSort }
}
