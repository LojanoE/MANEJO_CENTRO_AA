import { useRef, useState } from 'react'
import { bandCutoffs, scoreBand, type PsychTestDef } from '../../config/psychTests'
import type { PsychTestResult } from '../../types/psychology'

/**
 * Evolución del puntaje de UN test (small multiple: una gráfica por test, cada
 * una con su propia escala; nunca dos escalas en el mismo eje).
 * Serie única → sin leyenda (el título la nombra). Líneas guía en los puntos
 * de corte; tooltip al pasar el puntero o enfocar un punto con el teclado.
 * El valor de cada punto también está en la tabla de resultados.
 */

const W = 320
const H = 150
const PAD = { top: 14, right: 34, bottom: 22, left: 30 }
/** Validado con dataviz/validate_palette.js: contraste ≥ 3:1 sobre la superficie clara. */
const SERIES = '#059669'
const GRID = '#e2e8f0'

const time = (date: string) => new Date(`${date}T00:00:00`).getTime()

export default function TestTrendChart({
  def,
  results,
  substance,
}: {
  def: PsychTestDef
  /** Resultados en orden cronológico. */
  results: PsychTestResult[]
  substance?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const points = results.filter((r): r is PsychTestResult & { score: number } => r.score != null)
  if (points.length === 0) return null

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const t0 = time(points[0].date)
  const t1 = time(points[points.length - 1].date)
  const x = (date: string) => (t1 === t0 ? PAD.left + innerW / 2 : PAD.left + ((time(date) - t0) / (t1 - t0)) * innerW)
  const y = (score: number) => PAD.top + innerH - ((score - def.min) / (def.max - def.min)) * innerH

  const ticks = [...new Set([def.min, ...bandCutoffs(def, substance), def.max])].sort((a, b) => a - b)
  // Etiquetas del eje: se omiten las que quedarían apretadas (< 12 unidades de la
  // anterior, ~1,3 veces el alto del texto); la línea guía se dibuja igual.
  const labeledTicks = new Set<number>()
  let lastLabelY = Infinity
  for (const t of ticks) {
    if (Math.abs(lastLabelY - y(t)) >= 12) {
      labeledTicks.add(t)
      lastLabelY = y(t)
    }
  }
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const lastBand = scoreBand(def, last.score, last.substance)
  const current = active != null ? points[active] : null

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const vx = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - vx) < Math.abs(x(points[nearest].date) - vx)) nearest = i
    })
    setActive(nearest)
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="font-bold text-slate-800">
          {def.name}
          {substance ? ` · ${substance}` : ''}
        </p>
        <p className="text-right text-xs text-slate-500">
          Último: <span className="font-semibold text-slate-700">{last.score}</span> · {lastBand?.label ?? last.interpretation}
        </p>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Evolución del puntaje de ${def.name}`}
          onPointerMove={handlePointer}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              {labeledTicks.has(t) && (
                <text x={PAD.left - 5} y={y(t) + 3} textAnchor="end" className="fill-slate-400 text-[9px] tabular-nums">
                  {t}
                </text>
              )}
            </g>
          ))}

          <text x={PAD.left} y={H - 6} className="fill-slate-400 text-[9px]">
            {points[0].date}
          </text>
          {points.length > 1 && (
            <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-slate-400 text-[9px]">
              {last.date}
            </text>
          )}

          {current && (
            <line x1={x(current.date)} x2={x(current.date)} y1={PAD.top} y2={PAD.top + innerH} stroke="#94a3b8" strokeWidth={1} />
          )}

          {points.length > 1 && (
            <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}

          {points.map((p, i) => (
            <g key={p.id}>
              <circle cx={x(p.date)} cy={y(p.score)} r={active === i ? 5 : 4} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
              <circle
                cx={x(p.date)}
                cy={y(p.score)}
                r={12}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.date}: ${p.score} puntos, ${p.interpretation}`}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              />
            </g>
          ))}

          <text x={x(last.date) + 8} y={y(last.score) + 3} className="fill-slate-700 text-[10px] font-semibold tabular-nums">
            {last.score}
          </text>
        </svg>

        {current && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-48 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(current.date) / W) * 100}%`, top: `calc(${(y(current.score) / H) * 100}% - 10px)` }}
          >
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: SERIES }} />
              <span className="font-bold text-slate-900 tabular-nums">{current.score}</span>
              <span className="text-slate-400">/ {def.max}</span>
            </p>
            <p className="text-slate-500">{current.date}</p>
            {current.interpretation && <p className="text-slate-600">{current.interpretation}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
