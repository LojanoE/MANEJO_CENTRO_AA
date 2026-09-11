import type { FormAnswers, FormTemplate, PrefillKey, TemplateBlock } from '../../../config/formTemplates/types'
import { PSYCH_TESTS } from '../../../config/psychTests'
import {
  answerList,
  answerQuestion,
  answerTable,
  answerText,
  cellKey,
  templateKeys,
  type TemplateKeys,
} from '../../../utils/formAnswers'
import type { TestResultRow } from '../../../utils/psychology'
import { CellGrid, Mark, Section, SheetTitle, Signatures, WriteLines } from './primitives'

/**
 * Imprime un formato declarativo (config/formTemplates):
 * - sin `answers`: pre-llenado con los datos del paciente y el resto en blanco;
 * - con `answers`: lleno con lo registrado en el sistema (los campos vacíos
 *   quedan con renglones para completar a mano).
 */

const ROW_HEIGHT = { sm: 'h-5', md: 'h-7', lg: 'h-12' } as const
const cell = 'border border-slate-400 px-1 py-0.5 align-top'

interface BlockContext {
  values: Record<PrefillKey, string>
  answers?: FormAnswers
  testRows?: TestResultRow[]
  keys: TemplateKeys
  si: number
  bi: number
}

function Block({ block, ctx }: { block: TemplateBlock; ctx: BlockContext }) {
  const { values, answers, keys, si, bi } = ctx

  switch (block.kind) {
    case 'grid':
      return (
        <CellGrid
          cols={block.cols}
          items={block.items.map((it, ii) => ({
            label: it.label,
            value: answerText(answers, keys.item(si, bi, ii)) || (it.prefill ? values[it.prefill] : ''),
            span: it.span,
          }))}
        />
      )

    case 'text': {
      const value = answerText(answers, keys.block(si, bi)).trim()
      return (
        <div className="px-2 pt-1 pb-1.5 break-inside-avoid">
          {block.label && <p className="text-[9px] font-bold uppercase text-slate-700">{block.label}</p>}
          {value ? (
            <p className="text-[10.5px] leading-snug text-slate-900 whitespace-pre-wrap">{value}</p>
          ) : (
            <>
              {block.hint && <p className="text-[8.5px] italic leading-tight text-slate-500">{block.hint}</p>}
              <WriteLines count={block.lines} />
            </>
          )}
        </div>
      )
    }

    case 'checks': {
      const selected = answerList(answers, keys.block(si, bi))
      return (
        <div className="px-2 py-1 break-inside-avoid">
          {block.label && <p className="mb-0.5 text-[9px] font-bold uppercase text-slate-700">{block.label}</p>}
          <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: `repeat(${block.cols ?? 3}, minmax(0, 1fr))` }}>
            {block.options.map((o) => (
              <span key={o} className="flex items-center gap-1.5 text-[9.5px] text-slate-800">
                <Mark checked={selected.includes(o)} /> {o}
              </span>
            ))}
          </div>
        </div>
      )
    }

    case 'questions':
      return (
        <div className="px-2 py-0.5">
          {block.items.map((q, ii) => {
            const a = answerQuestion(answers, keys.item(si, bi, ii))
            return (
              <div key={q.label} className="flex items-end gap-3 py-1 text-[9.5px] text-slate-800 break-inside-avoid">
                <span className="w-[42%] shrink-0">{q.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  SÍ <Mark checked={a.answer === 'SI'} />
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  NO <Mark checked={a.answer === 'NO'} />
                </span>
                {q.detail ? (
                  <span className="flex min-w-0 flex-1 items-end gap-1">
                    <span className="shrink-0 text-[8.5px] text-slate-500">{q.detail}:</span>
                    <span className="min-h-3.5 flex-1 border-b border-dotted border-slate-400 text-[10px] leading-tight">
                      {a.detail}
                    </span>
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
            )
          })}
        </div>
      )

    case 'table': {
      const table = answerTable(answers, keys.block(si, bi))
      const rows: string[][] =
        typeof block.rows === 'number'
          ? Array.from({ length: block.rows }, () => [])
          : block.rows.map((r) => (Array.isArray(r) ? r : [r]))
      const height = ROW_HEIGHT[block.rowHeight ?? 'sm']
      return (
        <div>
          {block.label && (
            <p className="border-b border-slate-400 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-700">
              {block.label}
            </p>
          )}
          <table className="w-full table-fixed border-collapse border-hidden text-[9px]">
            <colgroup>
              {block.numbered && <col style={{ width: '5%' }} />}
              {block.columns.map((c, i) => (
                <col key={i} style={c.width ? { width: c.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {block.numbered && (
                  <th className={`${cell} bg-slate-100 text-left text-[7.5px] font-bold uppercase text-slate-600`}>N°</th>
                )}
                {block.columns.map((c, i) => (
                  <th key={i} className={`${cell} bg-slate-100 text-left text-[7.5px] font-bold uppercase leading-tight text-slate-600`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={`${height} break-inside-avoid`}>
                  {block.numbered && <td className={`${cell} text-slate-500`}>{ri + 1}</td>}
                  {block.columns.map((_, ci) => (
                    <td key={ci} className={`${cell} ${r[ci] ? 'font-semibold text-slate-800' : 'whitespace-pre-wrap'}`}>
                      {r[ci] || table[cellKey(ri, ci)] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.note && <p className="px-2 py-0.5 text-[8px] text-slate-500">{block.note}</p>}
        </div>
      )
    }

    case 'testResults': {
      const rows =
        ctx.testRows && ctx.testRows.length > 0
          ? ctx.testRows
          : PSYCH_TESTS.map((t) => ({ test: t.name, date: '', score: '', interpretation: '' }))
      return (
        <table className="w-full table-fixed border-collapse border-hidden text-[9px]">
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              {['Test', 'Fecha', 'Puntaje', 'Interpretación'].map((h) => (
                <th key={h} className={`${cell} bg-slate-100 text-left text-[7.5px] font-bold uppercase text-slate-600`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="h-5 break-inside-avoid">
                <td className={`${cell} font-semibold text-slate-800`}>{r.test}</td>
                <td className={cell}>{r.date}</td>
                <td className={cell}>{r.score}</td>
                <td className={cell}>{r.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    case 'photo':
      return (
        <div className="flex h-48 items-start border border-dashed border-slate-400 px-2 py-1 text-[9px] font-bold uppercase text-slate-500 break-inside-avoid">
          {block.label}
        </div>
      )

    case 'signatures':
      return <Signatures signers={block.signers} />
  }
}

export default function BlankFormSheet({
  template,
  values,
  answers,
  testRows,
}: {
  template: FormTemplate
  values: Record<PrefillKey, string>
  answers?: FormAnswers
  testRows?: TestResultRow[]
}) {
  const keys = templateKeys(template)
  return (
    <div className="space-y-1.5 text-slate-900">
      <SheetTitle title={template.title} code={template.code} hc={values.hc} />
      {template.sections.map((section, si) => {
        const blocks = section.blocks.map((b, bi) => (
          <Block key={bi} block={b} ctx={{ values, answers, testRows, keys, si, bi }} />
        ))
        const framed = section.title || section.blocks.some((b) => b.kind !== 'signatures' && b.kind !== 'photo')
        if (!framed) return <div key={si}>{blocks}</div>
        return (
          <Section key={si} title={section.title} hint={section.hint}>
            <div className="divide-y divide-slate-300">{blocks}</div>
          </Section>
        )
      })}
    </div>
  )
}
