import type { SortDirection } from '../../hooks/useTableSort'

/** Small arrow shown next to a clickable table header, active only for the current sort column. */
export default function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>
  return <span className="ml-1 text-emerald-700">{direction === 'asc' ? '↑' : '↓'}</span>
}
