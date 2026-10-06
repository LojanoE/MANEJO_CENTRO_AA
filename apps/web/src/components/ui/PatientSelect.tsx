import { useEffect, useMemo, useRef, useState } from 'react'
import { matchesQuery } from '../../utils/search'

interface PatientSelectProps {
  value: string | null | undefined
  onChange: (patientId: string | null) => void
  patients: { id: string; name: string; idCard?: string }[]
  required?: boolean
}

export default function PatientSelect({ value, onChange, patients, required }: PatientSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = patients.find((p) => p.id === value)

  const results = useMemo(
    () => patients.filter((p) => matchesQuery(query, p.name, p.idCard)),
    [patients, query],
  )

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function pick(id: string | null) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  // Opción 0 = «Ninguno» (solo si no es obligatorio); el resto son resultados.
  const offset = required ? 0 : 1
  const total = results.length + offset

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (!required && active === 0) pick(null)
      else if (results[active - offset]) pick(results[active - offset].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={open ? query : selected?.name ?? ''}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(offset)
          setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
          setActive(offset)
        }}
        onKeyDown={onKeyDown}
        placeholder={selected ? selected.name : '🔍 Buscar paciente…'}
        className="form-input"
        autoComplete="off"
      />
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value ?? ''}
          onChange={() => {}}
          className="absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
        />
      )}
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {!required && (
            <li
              onMouseDown={(e) => {
                e.preventDefault()
                pick(null)
              }}
              className={`cursor-pointer px-3 py-2 text-sm text-slate-400 ${active === 0 ? 'bg-slate-100' : ''}`}
            >
              — Ninguno —
            </li>
          )}
          {results.map((p, i) => (
            <li
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(p.id)
              }}
              onMouseEnter={() => setActive(i + offset)}
              className={`cursor-pointer px-3 py-2 text-sm text-slate-700 ${active === i + offset ? 'bg-emerald-50' : ''} ${p.id === value ? 'font-bold' : ''}`}
            >
              {p.name}
              {p.idCard && <span className="ml-2 text-xs text-slate-400">{p.idCard}</span>}
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Sin coincidencias</li>}
        </ul>
      )}
    </div>
  )
}
