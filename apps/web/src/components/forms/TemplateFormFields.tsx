import type { ReactNode } from 'react'
import type { AnswerValue, FormAnswers, FormTemplate, TemplateBlock } from '../../config/formTemplates/types'
import { answerList, answerQuestion, answerTable, answerText, cellKey, templateKeys } from '../../utils/formAnswers'
import ToggleChip from '../ui/ToggleChip'

/**
 * Formulario editable generado desde un formato declarativo
 * (config/formTemplates). Es el motor de los formatos digitales del centro:
 * lo que se llena aquí se imprime con BlankFormSheet pasando las mismas
 * respuestas, así el papel y la pantalla no divergen.
 */

interface Props {
  template: FormTemplate
  answers: FormAnswers
  onChange: (key: string, value: AnswerValue) => void
  readOnly?: boolean
  /** Contenido del bloque `testResults` (resultados registrados aparte). */
  renderTestResults?: () => ReactNode
}

const SPAN_CLASS: Record<number, string> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 lg:col-span-3',
  4: 'md:col-span-2 lg:col-span-4',
}

/** Traduce el ancho del papel (n de `cols`) a la grilla de 4 columnas de la pantalla. */
const uiSpan = (span: number | undefined, cols: number) => Math.min(4, Math.max(1, Math.round(((span ?? 1) * 4) / cols)))

function FieldBlock({
  block,
  si,
  bi,
  props,
}: {
  block: TemplateBlock
  si: number
  bi: number
  props: Props
}) {
  const { template, answers, onChange, readOnly = false, renderTestResults } = props
  const keys = templateKeys(template)

  switch (block.kind) {
    case 'grid':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {block.items.map((it, ii) => {
            const key = keys.item(si, bi, ii)
            return (
              <div key={key} className={SPAN_CLASS[uiSpan(it.span, block.cols)]}>
                <label className="form-label">{it.label}</label>
                <input
                  value={answerText(answers, key)}
                  onChange={(e) => onChange(key, e.target.value)}
                  disabled={readOnly}
                  className="form-input disabled:text-slate-500"
                />
              </div>
            )
          })}
        </div>
      )

    case 'text': {
      const key = keys.block(si, bi)
      return (
        <div>
          {block.label && <label className="form-label">{block.label}</label>}
          {block.hint && <p className="mb-1.5 text-xs text-slate-400">{block.hint}</p>}
          <textarea
            value={answerText(answers, key)}
            onChange={(e) => onChange(key, e.target.value)}
            rows={Math.max(3, block.lines + 1)}
            disabled={readOnly}
            className="form-textarea disabled:text-slate-500"
          />
        </div>
      )
    }

    case 'checks': {
      const key = keys.block(si, bi)
      const selected = answerList(answers, key)
      return (
        <div>
          {block.label && <label className="form-label">{block.label}</label>}
          <div className="flex flex-wrap gap-2">
            {block.options.map((option) => (
              <ToggleChip
                key={option}
                label={option}
                active={selected.includes(option)}
                disabled={readOnly}
                onClick={() =>
                  onChange(key, selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option])
                }
              />
            ))}
          </div>
        </div>
      )
    }

    case 'questions':
      return (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {block.items.map((q, ii) => {
            const key = keys.item(si, bi, ii)
            const a = answerQuestion(answers, key)
            return (
              <div key={key} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3">
                <p className="text-sm text-slate-700">{q.label}</p>
                <div className="flex gap-2">
                  {(['SI', 'NO'] as const).map((opt) => (
                    <ToggleChip
                      key={opt}
                      label={opt === 'SI' ? 'Sí' : 'No'}
                      active={a.answer === opt}
                      disabled={readOnly}
                      onClick={() => onChange(key, { ...a, answer: a.answer === opt ? '' : opt })}
                    />
                  ))}
                </div>
                {q.detail ? (
                  <input
                    value={a.detail}
                    onChange={(e) => onChange(key, { ...a, detail: e.target.value })}
                    placeholder={q.detail}
                    disabled={readOnly}
                    className="form-input disabled:text-slate-500"
                  />
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </div>
      )

    case 'table': {
      const key = keys.block(si, bi)
      const table = answerTable(answers, key)
      const rows: string[][] =
        typeof block.rows === 'number'
          ? Array.from({ length: block.rows }, () => [])
          : block.rows.map((r) => (Array.isArray(r) ? r : [r]))
      return (
        <div>
          {block.label && <label className="form-label">{block.label}</label>}
          {block.note && <p className="mb-1.5 text-xs text-slate-400">{block.note}</p>}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  {block.numbered && <th className="w-10 px-3 py-2">N°</th>}
                  {block.columns.map((c, ci) => (
                    <th key={ci} className="px-3 py-2" style={c.width ? { width: c.width } : undefined}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {block.numbered && <td className="px-3 py-1.5 text-slate-400">{ri + 1}</td>}
                    {block.columns.map((_, ci) =>
                      row[ci] ? (
                        <td key={ci} className="px-3 py-1.5 font-semibold text-slate-700">
                          {row[ci]}
                        </td>
                      ) : (
                        <td key={ci} className="px-1.5 py-1">
                          <input
                            value={table[cellKey(ri, ci)] ?? ''}
                            onChange={(e) => onChange(key, { ...table, [cellKey(ri, ci)]: e.target.value })}
                            disabled={readOnly}
                            className="w-full min-w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-slate-200 focus:border-emerald-400 focus:bg-white focus:outline-none"
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    case 'testResults':
      return <>{renderTestResults ? renderTestResults() : null}</>

    case 'photo':
    case 'signatures':
      return null
  }
}

export default function TemplateFormFields(props: Props) {
  const { template } = props
  let number = 0
  return (
    <div className="space-y-8">
      {template.sections.map((section, si) => {
        const visible = section.blocks.some((b) => b.kind !== 'signatures' && b.kind !== 'photo')
        if (!visible) return null
        number++
        return (
          <section key={si} className="space-y-4">
            <div className="border-b border-emerald-100 pb-2">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-emerald-800">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-emerald-100 px-1 text-xs text-emerald-700">
                  {number}
                </span>
                {section.title ?? 'Datos'}
              </h3>
              {section.hint && <p className="mt-1 text-xs text-slate-500">{section.hint}</p>}
            </div>
            {section.blocks.map((block, bi) => (
              <FieldBlock key={bi} block={block} si={si} bi={bi} props={props} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
