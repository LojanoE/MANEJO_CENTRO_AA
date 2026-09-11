import { useState } from 'react'

const PREVIEW = 5

export interface PendingItem {
  id: string
  label: string
  detail: string
  action: () => void
}

/** Lista corta de pendientes del expediente con enlace directo a resolver cada uno. */
export default function PendingList({ title, tone, items }: { title: string; tone: 'rose' | 'amber'; items: PendingItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, PREVIEW)
  const toneCls = tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${items.length > 0 ? toneCls : 'bg-emerald-50 text-emerald-700'}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin pendientes. ✅</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {shown.map((it) => (
            <li key={it.id}>
              <button
                onClick={it.action}
                className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm transition hover:text-emerald-700"
              >
                <span className="font-semibold text-slate-700">{it.label}</span>
                <span className="shrink-0 text-xs text-slate-400">{it.detail} →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > PREVIEW && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs font-bold text-emerald-700">
          {expanded ? 'Ver menos' : `Ver los ${items.length}`}
        </button>
      )}
    </div>
  )
}
