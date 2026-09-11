import {
  ANTECEDENTES_CATEGORIAS,
  EXAMEN_FISICO_REGIONAL,
  EXAMEN_FISICO_SISTEMICO,
  REVISION_SISTEMAS_LABELS,
  SIGNOS_VITALES_LABELS,
  type MedicalRecord,
  type RecordEntry,
} from '../../../types/medicalRecord'
import type { Patient } from '../../../types/patient'
import type { Professional } from '../../../types/professional'
import { MSP_SHEET_CODES } from '../../../config/printableForms'
import { clean, hcNumber, sexLabel } from '../../../utils/clinicalPrint'
import { isMarked } from '../../../utils/mspEntry'
import { surnamesFirst } from '../../../utils/admission'
import { CellGrid, CheckLabel, Mark, Section, SheetTitle, TextBody } from './primitives'

interface Props {
  /** Sin entrada = hoja en blanco (con los datos del paciente si se pasan). */
  entry?: RecordEntry | null
  patient?: Patient | null
  record?: MedicalRecord | null
  professional?: Professional | null
  centerName: string
  establishmentCode?: string
}

type CodedItem = { key: string; code: string; label: string }

function CodedGrid({ items, cols, map }: { items: CodedItem[]; cols: number; map?: Partial<Record<string, string>> }) {
  return (
    <div className="grid gap-px bg-slate-300" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-1 bg-white px-1 py-0.5 text-[8.5px]">
          <span className="w-6 shrink-0 font-bold text-slate-500">{it.code}</span>
          <span className="flex-1 uppercase leading-tight text-slate-800">{it.label}</span>
          <Mark checked={isMarked(map, it.key)} />
        </div>
      ))}
    </div>
  )
}

/** Descripción de lo marcado en G o H: "3R Ojos: hallazgo". */
function markedDescriptions(items: CodedItem[], map?: Partial<Record<string, string>>): string {
  const lines = items
    .filter((it) => isMarked(map, it.key))
    .map((it) => `${it.code} ${it.label}: ${clean(map?.[it.key]) || 'con patología'}`)
  return lines.length > 0 ? lines.join('\n') : ''
}

/**
 * Formulario MSP 002 con la estructura del papel del centro (secciones A–K).
 * Sirve para imprimir una consulta registrada o una hoja en blanco pre-llenada.
 */
export default function Msp002Sheet({ entry, patient, record, professional, centerName, establishmentCode }: Props) {
  const blank = !entry
  const sv = entry?.signosVitales
  const personales = new Set<string>(entry?.antecedentesPersonalesMarcados ?? [])
  const familiares = new Set<string>(entry?.antecedentesFamiliaresMarcados ?? [])
  const examen = entry?.examenFisico as Partial<Record<string, string>> | undefined
  const revision = entry?.revisionSistemas as Partial<Record<string, string>> | undefined

  const diagnosticos = (entry?.diagnosticos ?? []).filter((d) => clean(d.descripcion) || clean(d.codigo))
  const dxRows = Math.max(3, Math.ceil(diagnosticos.length / 2))

  const examenDescripcion = [
    clean(examen?.general) && `Examen general / estado mental: ${clean(examen?.general)}`,
    markedDescriptions([...EXAMEN_FISICO_REGIONAL, ...EXAMEN_FISICO_SISTEMICO], examen),
    clean(examen?.extremidades) && `Extremidades (registro anterior): ${clean(examen?.extremidades)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const planTexto = [
    clean(entry?.planTratamiento),
    clean(entry?.evolucion) && `Evolución y pronóstico: ${clean(entry?.evolucion)}`,
    clean(entry?.observaciones) && `Observaciones: ${clean(entry?.observaciones)}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const professionalName = blank ? '' : professional?.name ?? entry?.authorName ?? record?.doctorName ?? ''

  return (
    <div className="space-y-1.5 text-slate-900">
      <SheetTitle title="Historia clínica — consulta externa" code={MSP_SHEET_CODES['002']} hc={hcNumber(patient, record)} />

      <Section letter="A" title="Datos del establecimiento y usuario / paciente">
        <CellGrid
          cols={6}
          items={[
            { label: 'Establecimiento', value: [centerName, establishmentCode].filter(Boolean).join(' · '), span: 2 },
            { label: 'Apellidos y nombres', value: patient ? surnamesFirst(patient) : record?.patientName ?? '', span: 2 },
            { label: 'Sexo', value: sexLabel(patient?.sex) },
            { label: 'Edad (años)', value: patient?.age ? String(patient.age) : '' },
          ]}
        />
      </Section>

      <Section
        letter="B"
        title="Motivo de consulta"
        right={
          <>
            <CheckLabel label="Primera" checked={entry?.tipoConsulta === 'Primera'} />
            <CheckLabel label="Subsecuente" checked={entry?.tipoConsulta === 'Subsecuente'} />
          </>
        }
      >
        <TextBody blank={blank} value={clean(entry?.motivoConsulta)} lines={2} />
      </Section>

      {(
        [
          ['C', 'Antecedentes patológicos personales', personales, entry?.antecedentesPersonales],
          ['D', 'Antecedentes patológicos familiares', familiares, entry?.antecedentesFamiliares],
        ] as const
      ).map(([letter, title, marked, texto]) => (
        <Section
          key={letter}
          letter={letter}
          title={title}
          hint={letter === 'C' ? 'Datos clínico-quirúrgicos, obstétricos, alérgicos relevantes' : undefined}
        >
          <CodedGrid
            cols={5}
            items={ANTECEDENTES_CATEGORIAS.map((c, i) => ({ key: c, code: `${i + 1}.`, label: c }))}
            map={Object.fromEntries([...marked].map((m) => [m, '']))}
          />
          <TextBody blank={blank} value={clean(texto)} lines={2} />
        </Section>
      ))}

      <Section
        letter="E"
        title="Enfermedad o problema actual"
        hint="Cronología · localización · características · intensidad · frecuencia · factores agravantes"
      >
        <TextBody blank={blank} value={clean(entry?.enfermedadActual)} lines={4} />
      </Section>

      <Section letter="F" title="Constantes vitales y antropometría">
        <table className="w-full table-fixed border-collapse border-hidden text-center">
          <thead>
            <tr>
              {['Fecha', 'Hora', ...SIGNOS_VITALES_LABELS.map((s) => `${s.label} (${s.hint})`)].map((h) => (
                <th key={h} className="border border-slate-400 bg-slate-50 px-0.5 py-0.5 text-[6.5px] font-bold uppercase leading-tight text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="h-6 text-[9.5px]">
              <td className="border border-slate-400 px-0.5">{entry?.date ?? ''}</td>
              <td className="border border-slate-400 px-0.5">{clean(entry?.hora)}</td>
              {SIGNOS_VITALES_LABELS.map(({ key }) => (
                <td key={key} className="border border-slate-400 px-0.5">
                  {clean(sv?.[key])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Section>

      <Section letter="G" title="Revisión actual de órganos y sistemas" hint='Marcar "X" cuando presente patología y describa'>
        <CodedGrid cols={5} items={REVISION_SISTEMAS_LABELS} map={revision} />
        <TextBody blank={blank} value={markedDescriptions(REVISION_SISTEMAS_LABELS, revision)} lines={3} />
      </Section>

      <Section letter="H" title="Examen físico" hint='Marcar "X" cuando presente patología y describa'>
        <div className="grid grid-cols-[3fr_2fr] gap-px bg-slate-400">
          <div className="bg-white">
            <p className="bg-slate-50 px-1 text-[8px] font-bold uppercase text-slate-600">Regional</p>
            <CodedGrid cols={3} items={EXAMEN_FISICO_REGIONAL} map={examen} />
          </div>
          <div className="bg-white">
            <p className="bg-slate-50 px-1 text-[8px] font-bold uppercase text-slate-600">Sistémico</p>
            <CodedGrid cols={2} items={EXAMEN_FISICO_SISTEMICO} map={examen} />
          </div>
        </div>
        <TextBody blank={blank} value={examenDescripcion} lines={4} />
      </Section>

      <Section letter="I" title="Diagnóstico" hint="PRE = presuntivo · DEF = definitivo">
        <table className="w-full table-fixed border-collapse border-hidden text-[9.5px]">
          <colgroup>
            {[0, 1].map((half) => (
              <FragmentCols key={half} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {[0, 1].flatMap((half) =>
                ['N°', 'Descripción', 'CIE', 'PRE', 'DEF'].map((h) => (
                  <th key={`${half}-${h}`} className="border border-slate-400 bg-slate-50 px-1 py-0.5 text-left text-[7.5px] font-bold uppercase text-slate-600">
                    {h}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: dxRows }, (_, row) => (
              <tr key={row} className="h-5">
                {[0, 1].flatMap((half) => {
                  const idx = row + half * dxRows
                  const d = diagnosticos[idx]
                  return [
                    <td key={`${half}-n`} className="border border-slate-400 px-1 text-slate-500">{idx + 1}.</td>,
                    <td key={`${half}-d`} className="border border-slate-400 px-1">{d?.descripcion ?? ''}</td>,
                    <td key={`${half}-c`} className="border border-slate-400 px-1 font-mono">{d?.codigo ?? ''}</td>,
                    <td key={`${half}-p`} className="border border-slate-400 px-1 text-center font-bold">{d?.tipo === 'Presuntivo' ? 'X' : ''}</td>,
                    <td key={`${half}-f`} className="border border-slate-400 px-1 text-center font-bold">{d?.tipo === 'Definitivo' ? 'X' : ''}</td>,
                  ]
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section letter="J" title="Plan de tratamiento" hint="Diagnóstico, terapéutico y educacional">
        <TextBody blank={blank} value={planTexto} lines={4} />
      </Section>

      <Section letter="K" title="Datos del profesional responsable">
        <div className="break-inside-avoid">
          <CellGrid
            cols={8}
            items={[
              { label: 'Fecha (aaaa-mm-dd)', value: entry?.date ?? '' },
              { label: 'Hora (hh:mm)', value: clean(entry?.hora) },
              { label: 'Nombre del profesional', value: professionalName, span: 2 },
              { label: 'N° documento de identificación', value: blank ? '' : professional?.idCard ?? '' },
              { label: 'Registro profesional', value: blank ? '' : professional?.registro ?? '' },
              { label: 'Firma', tall: true },
              { label: 'Sello', tall: true },
            ]}
          />
        </div>
      </Section>
    </div>
  )
}

/** Anchos de una mitad de la tabla de diagnósticos (N°, descripción, CIE, PRE, DEF). */
function FragmentCols() {
  return (
    <>
      <col style={{ width: '4%' }} />
      <col style={{ width: '28%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '5%' }} />
    </>
  )
}
