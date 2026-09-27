import type { MedicalRecord } from '../../../types/medicalRecord'
import type { Patient } from '../../../types/patient'
import type { OccupationalSession } from '../../../types/occupational'
import { hcNumber } from '../../../utils/clinicalPrint'
import { surnamesFirst } from '../../../utils/admission'
import { CellGrid, Section, SheetTitle } from './primitives'

const td = 'border border-slate-400 px-1 py-0.5 align-top'
const th = `${td} bg-slate-100 text-left text-[7.5px] font-bold uppercase leading-tight text-slate-600`

/** Hoja de evolución ocupacional (atención individual): una fila por atención, como el formato en papel. */
export default function OccupationalEvolutionSheet({
  sessions,
  patient,
  record,
  blankRows = 0,
}: {
  sessions: OccupationalSession[]
  patient: Patient
  record?: MedicalRecord | null
  blankRows?: number
}) {
  return (
    <div className="space-y-1.5 text-slate-900">
      <SheetTitle title="Hoja de evolución — atención individual" hc={hcNumber(patient, record)} />
      <Section>
        <CellGrid
          cols={4}
          items={[
            { label: 'Nombre', value: surnamesFirst(patient), span: 3 },
            { label: 'H.C.', value: hcNumber(patient, record) },
          ]}
        />
      </Section>
      <Section>
        <table className="w-full table-fixed border-collapse border-hidden text-[9.5px] leading-snug">
          <colgroup>
            <col style={{ width: '13%' }} />
            <col />
            <col style={{ width: '30%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              {['Fecha', 'Proceso terapéutico', 'Observaciones', 'Firma'].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="break-inside-avoid">
                <td className={td}>
                  <p className="whitespace-nowrap">{s.date}</p>
                  {s.hora && <p className="text-slate-500">{s.hora}</p>}
                </td>
                <td className={`${td} whitespace-pre-wrap`}>{s.process}</td>
                <td className={`${td} whitespace-pre-wrap`}>{s.observations}</td>
                <td className={td}>
                  <div className="h-8" />
                  <p className="border-t border-dotted border-slate-400 pt-0.5 text-[8px] text-slate-600">{s.authorName ?? ''}</p>
                </td>
              </tr>
            ))}
            {Array.from({ length: blankRows }, (_, i) => (
              <tr key={`blank-${i}`} className="h-16 break-inside-avoid">
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={td} />
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
