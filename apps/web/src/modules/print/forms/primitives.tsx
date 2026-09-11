import type { CSSProperties, ReactNode } from 'react'

/**
 * Piezas visuales compartidas por las hojas oficiales (002, 005) y los formatos
 * pre-llenados: bordes finos, rótulos en mayúscula pequeña y casillas de X,
 * como el formulario en papel. Las líneas internas de las grillas se dibujan
 * con `gap-px` sobre fondo gris (ver `print-color-adjust` en index.css).
 */

export function SheetTitle({ title, code, hc }: { title: string; code?: string; hc?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] border border-slate-500 text-[10px] break-inside-avoid">
      <div className="bg-slate-100 px-2 py-1.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900">{title}</p>
      </div>
      <div className="flex items-center border-l border-slate-500 px-2 font-bold whitespace-nowrap">{code ?? ''}</div>
      <div className="min-w-28 border-l border-slate-500 px-2 py-1">
        <p className="text-[7.5px] font-bold uppercase text-slate-500">N° historia clínica</p>
        <p className="min-h-[14px] font-bold">{hc}</p>
      </div>
    </div>
  )
}

export function Section({
  letter,
  title,
  hint,
  right,
  children,
}: {
  letter?: string
  title?: string
  hint?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border border-slate-500">
      {(title || letter) && (
        <div className="flex flex-wrap items-center gap-x-2 border-b border-slate-500 bg-slate-100 px-2 py-0.5 break-after-avoid">
          {letter && <span className="text-[10px] font-extrabold text-slate-800">{letter}.</span>}
          <span className="text-[9.5px] font-extrabold uppercase tracking-wide text-slate-800">{title}</span>
          {hint && <span className="text-[7.5px] uppercase text-slate-500">{hint}</span>}
          {right && <div className="ml-auto flex items-center gap-3">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Cell({
  label,
  value,
  className = '',
  style,
  tall = false,
}: {
  label: string
  value?: string
  className?: string
  style?: CSSProperties
  tall?: boolean
}) {
  return (
    <div className={`bg-white px-1.5 py-0.5 ${className}`} style={style}>
      <p className="text-[7.5px] font-bold uppercase leading-tight tracking-wide text-slate-500">{label}</p>
      <p className={`text-[10.5px] leading-snug text-slate-900 whitespace-pre-wrap ${tall ? 'min-h-10' : 'min-h-[15px]'}`}>
        {value}
      </p>
    </div>
  )
}

/** Grilla de celdas con líneas de 1px. Extiende la última celda para completar la fila. */
export function CellGrid({ cols, items }: { cols: number; items: { label: string; value?: string; span?: number; tall?: boolean }[] }) {
  const used = items.reduce((sum, it) => sum + Math.min(it.span ?? 1, cols), 0)
  const remainder = used % cols
  return (
    <div className="grid gap-px bg-slate-400" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((it, i) => {
        let span = Math.min(it.span ?? 1, cols)
        if (i === items.length - 1 && remainder > 0) span += cols - remainder
        return <Cell key={i} label={it.label} value={it.value} tall={it.tall} style={{ gridColumn: `span ${span} / span ${span}` }} />
      })}
    </div>
  )
}

export function Mark({ checked = false }: { checked?: boolean }) {
  return (
    <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center border border-slate-600 bg-white text-[9px] font-bold leading-none text-slate-900">
      {checked ? 'X' : ''}
    </span>
  )
}

export function CheckLabel({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase text-slate-700">
      {label} <Mark checked={checked} />
    </span>
  )
}

export function WriteLines({ count }: { count: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-5 border-b border-dotted border-slate-400" />
      ))}
    </div>
  )
}

/** Texto de una sección: el contenido registrado o, en una hoja en blanco, renglones. */
export function TextBody({ value, blank, lines = 3 }: { value?: string; blank?: boolean; lines?: number }) {
  if (blank) {
    return (
      <div className="px-2 pb-1">
        <WriteLines count={lines} />
      </div>
    )
  }
  return (
    <div className="min-h-7 px-2 py-1 text-[10.5px] leading-snug text-slate-900 whitespace-pre-wrap">{value || '—'}</div>
  )
}

export function Signatures({ signers }: { signers: string[] }) {
  return (
    <div
      className="grid gap-10 px-4 pt-12 pb-2 break-inside-avoid"
      style={{ gridTemplateColumns: `repeat(${Math.max(signers.length, 1)}, minmax(0, 1fr))` }}
    >
      {signers.map((s) => (
        <div key={s} className="text-[9px] text-slate-700">
          <div className="border-t border-slate-700 pt-1 text-center font-bold uppercase">{s}</div>
          <p className="mt-2">C.I.: ______________________</p>
        </div>
      ))}
    </div>
  )
}
