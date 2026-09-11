import type { MedicalRecord, RecordEntry } from '../../../types/medicalRecord'
import type { Patient } from '../../../types/patient'
import type { Professional } from '../../../types/professional'
import { MSP_SHEET_CODES } from '../../../config/printableForms'
import { clean, findProfessional, hcNumber, sexLabel } from '../../../utils/clinicalPrint'
import { diagnosticosText, prescripcionText, tratamientoText } from '../../../utils/mspEntry'
import { surnamesFirst } from '../../../utils/admission'
import { CellGrid, CheckLabel, Section, SheetTitle } from './primitives'

interface Props {
  /** Evoluciones a imprimir, ya ordenadas. Vacío + `blankRows` = hoja en blanco. */
  entries: RecordEntry[]
  patient?: Patient | null
  record?: MedicalRecord | null
  professionals: Professional[]
  centerName: string
  establishmentCode?: string
  /** Filas vacías adicionales para escribir a mano. */
  blankRows?: number
}

const td = 'border border-slate-400 px-1 py-0.5 align-top'

/**
 * Formulario MSP 005 como hoja continua: una fila por evolución, en orden
 * cronológico, con la columna de administración en rojo como pide el papel.
 * La cabecera de la tabla se repite en cada página impresa.
 */
export default function Msp005Sheet({
  entries,
  patient,
  record,
  professionals,
  centerName,
  establishmentCode,
  blankRows = 0,
}: Props) {
  const age = patient?.age ?? 0

  return (
    <div className="space-y-1.5 text-slate-900">
      <SheetTitle title="Evolución y prescripciones" code={MSP_SHEET_CODES['005']} hc={hcNumber(patient, record)} />

      <Section letter="A" title="Datos del establecimiento y usuario / paciente">
        <div className="grid grid-cols-[1fr_auto] gap-px bg-slate-400">
          <CellGrid
            cols={6}
            items={[
              { label: 'Establecimiento', value: [centerName, establishmentCode].filter(Boolean).join(' · '), span: 2 },
              { label: 'Apellidos y nombres', value: patient ? surnamesFirst(patient) : record?.patientName ?? '', span: 2 },
              { label: 'Sexo', value: sexLabel(patient?.sex) },
              { label: 'Edad', value: age ? String(age) : '' },
            ]}
          />
          <div className="bg-white px-1.5 py-0.5">
            <p className="text-[7.5px] font-bold uppercase text-slate-500">Condición edad</p>
            <div className="mt-0.5 flex gap-1.5">
              <CheckLabel label="H" />
              <CheckLabel label="D" />
              <CheckLabel label="M" />
              <CheckLabel label="A" checked={age > 0} />
            </div>
          </div>
        </div>
      </Section>

      <Section
        letter="B"
        title="Evolución y prescripciones"
        right={
          <span className="text-[7px] uppercase text-slate-500">
            Firmar al pie de cada evolución y prescripción · <span className="text-red-600">registrar con rojo</span> la
            administración de fármacos y dispositivos
          </span>
        }
      >
        <table className="w-full table-fixed border-collapse border-hidden text-[9.5px] leading-snug">
          <colgroup>
            <col style={{ width: '11%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '41%' }} />
            <col style={{ width: '29%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={3} className="border border-slate-400 bg-slate-100 py-0.5 text-[8px] font-extrabold uppercase">
                1. Evolución
              </th>
              <th colSpan={2} className="border border-slate-400 bg-slate-100 py-0.5 text-[8px] font-extrabold uppercase">
                2. Prescripciones
              </th>
            </tr>
            <tr className="text-[7px] font-bold uppercase leading-tight text-slate-600">
              <th className={`${td} bg-slate-50`}>Fecha (aaaa-mm-dd)</th>
              <th className={`${td} bg-slate-50`}>Hora (hh:mm)</th>
              <th className={`${td} bg-slate-50`}>Notas de evolución</th>
              <th className={`${td} bg-slate-50`}>Farmacoterapia e indicaciones (para enfermería y otro profesional de salud)</th>
              <th className={`${td} bg-slate-50`}>Administr. fármacos / dispositivo</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const prof = findProfessional(professionals, e.authorId, e.authorName)
              const prescripciones = (e.prescripciones ?? []).filter((p) => clean(p.medicamento))
              const dx = diagnosticosText(e)
              const plan = tratamientoText(e)
              return (
                <tr key={e.id} className="break-inside-avoid">
                  <td className={`${td} whitespace-nowrap`}>{e.date}</td>
                  <td className={td}>{clean(e.hora)}</td>
                  <td className={td}>
                    <p className="font-bold">{e.title}</p>
                    {clean(e.evolucion) && <p className="whitespace-pre-wrap">{clean(e.evolucion)}</p>}
                    {dx && (
                      <p className="mt-0.5 whitespace-pre-wrap">
                        <span className="font-bold">Dx: </span>
                        {dx}
                      </p>
                    )}
                    {plan && (
                      <p className="mt-0.5 whitespace-pre-wrap">
                        <span className="font-bold">Plan: </span>
                        {plan}
                      </p>
                    )}
                    {clean(e.observaciones) && (
                      <p className="mt-0.5 whitespace-pre-wrap">
                        <span className="font-bold">Obs.: </span>
                        {clean(e.observaciones)}
                      </p>
                    )}
                    <p className="mt-3 border-t border-dotted border-slate-400 pt-0.5 text-[8px] text-slate-600">
                      Firma: ____________ {prof?.name ?? e.authorName ?? ''}
                      {prof?.idCard ? ` · C.I. ${prof.idCard}` : ''}
                      {prof?.registro ? ` · Reg. ${prof.registro}` : ''}
                    </p>
                  </td>
                  <td className={td}>
                    {prescripciones.length > 0 && (
                      <ol className="list-decimal pl-3.5">
                        {prescripciones.map((p, i) => (
                          <li key={i}>{prescripcionText(p)}</li>
                        ))}
                      </ol>
                    )}
                    {clean(e.indicaciones) && (
                      <p className="mt-0.5 whitespace-pre-wrap">
                        <span className="font-bold">Indicaciones: </span>
                        {clean(e.indicaciones)}
                      </p>
                    )}
                  </td>
                  <td className={td}>
                    {prescripciones
                      .filter((p) => p.administrado)
                      .map((p, i) => (
                        <p key={i} className="font-bold text-red-600">
                          ✓ {p.medicamento}
                        </p>
                      ))}
                  </td>
                </tr>
              )
            })}
            {Array.from({ length: blankRows }, (_, i) => (
              <tr key={`blank-${i}`} className="h-20 break-inside-avoid">
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={td} />
              </tr>
            ))}
            {entries.length === 0 && blankRows === 0 && (
              <tr>
                <td colSpan={5} className={`${td} py-3 text-center text-slate-400`}>
                  Sin evoluciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
