import {
  ESTADOS_EGRESO,
  TIPOS_EGRESO,
  type DiagnosticoCie10,
  type MedicalRecord,
  type RecordEntry,
} from '../../../types/medicalRecord'
import type { Patient } from '../../../types/patient'
import type { Professional } from '../../../types/professional'
import { MSP_SHEET_CODES } from '../../../config/printableForms'
import { clean, hcNumber, sexLabel } from '../../../utils/clinicalPrint'
import { surnamesFirst } from '../../../utils/admission'
import { daysBetween } from '../../../utils/date'
import { CellGrid, Mark, Section, SheetTitle, TextBody } from './primitives'

interface Props {
  /** Sin entrada = hoja en blanco (con los datos del paciente si se pasan). */
  entry?: RecordEntry | null
  patient?: Patient | null
  record?: MedicalRecord | null
  professional?: Professional | null
  centerName: string
  establishmentCode?: string
}

const td = 'border border-slate-400 px-1 py-0.5 align-top'
const th = `${td} bg-slate-50 text-left text-[7.5px] font-bold uppercase leading-tight text-slate-600`

const validDx = (list: DiagnosticoCie10[] | undefined) => (list ?? []).filter((d) => clean(d.descripcion) || clean(d.codigo))

function DxTable({ list, blank }: { list: DiagnosticoCie10[]; blank: boolean }) {
  const rows = Math.max(blank ? 5 : 3, list.length)
  return (
    <table className="w-full table-fixed border-collapse border-hidden text-[9px]">
      <colgroup>
        <col style={{ width: '8%' }} />
        <col />
        <col style={{ width: '16%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '9%' }} />
      </colgroup>
      <thead>
        <tr>
          {['N°', 'Diagnóstico', 'CIE', 'PRE', 'DEF'].map((h) => (
            <th key={h} className={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => {
          const d = list[i]
          return (
            <tr key={i} className="h-5">
              <td className={`${td} text-slate-500`}>{i + 1}</td>
              <td className={td}>{d?.descripcion ?? ''}</td>
              <td className={`${td} font-mono`}>{d?.codigo ?? ''}</td>
              <td className={`${td} text-center font-bold`}>{d?.tipo === 'Presuntivo' ? 'X' : ''}</td>
              <td className={`${td} text-center font-bold`}>{d?.tipo === 'Definitivo' ? 'X' : ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Formulario MSP 006 Epicrisis con las secciones 1–9 del papel. */
export default function Msp006Sheet({ entry, patient, record, professional, centerName, establishmentCode }: Props) {
  const blank = !entry
  const dias = daysBetween(entry?.fechaIngreso, entry?.fechaEgreso)
  const medicos = (entry?.medicosTratantes ?? []).filter((m) => clean(m.nombre))
  const medicoRows = Math.max(blank ? 4 : 2, medicos.length)
  const professionalName = blank ? '' : professional?.name ?? entry?.authorName ?? record?.doctorName ?? ''

  return (
    <div className="space-y-1.5 text-slate-900">
      <SheetTitle title="Epicrisis" code={MSP_SHEET_CODES['006']} hc={hcNumber(patient, record)} />

      <Section>
        <CellGrid
          cols={8}
          items={[
            { label: 'Establecimiento', value: [centerName, establishmentCode].filter(Boolean).join(' · '), span: 2 },
            { label: 'Apellidos y nombres', value: patient ? surnamesFirst(patient) : record?.patientName ?? '', span: 3 },
            { label: 'Sexo', value: sexLabel(patient?.sex) },
            { label: 'Edad', value: patient?.age ? String(patient.age) : '' },
            { label: 'N° de hoja', value: blank ? '' : '1' },
            { label: 'Fecha de ingreso', value: entry ? clean(entry.fechaIngreso) : patient?.admission ?? '', span: 2 },
            { label: 'Fecha de egreso', value: clean(entry?.fechaEgreso), span: 2 },
            { label: 'Días de estada', value: dias != null ? String(dias) : '', span: 2 },
            { label: 'Días de incapacidad', value: clean(entry?.diasIncapacidad), span: 2 },
          ]}
        />
      </Section>

      <Section letter="1" title="Resumen del cuadro clínico">
        <TextBody blank={blank} value={clean(entry?.resumenCuadroClinico)} lines={5} />
      </Section>
      <Section letter="2" title="Resumen de evolución y complicaciones">
        <TextBody blank={blank} value={clean(entry?.resumenEvolucion)} lines={5} />
      </Section>
      <Section letter="3" title="Hallazgos relevantes de exámenes y procedimientos diagnósticos">
        <TextBody blank={blank} value={clean(entry?.hallazgosRelevantes)} lines={4} />
      </Section>
      <Section letter="4" title="Resumen de tratamiento y procedimientos terapéuticos">
        <TextBody blank={blank} value={clean(entry?.resumenTratamiento)} lines={5} />
      </Section>

      <div className="grid grid-cols-2 gap-1.5 break-inside-avoid">
        <Section letter="5" title="Diagnósticos de ingreso" hint="PRE / DEF">
          <DxTable list={validDx(entry?.diagnosticosIngreso)} blank={blank} />
        </Section>
        <Section letter="6" title="Diagnósticos de egreso" hint="PRE / DEF">
          <DxTable list={validDx(entry?.diagnosticosEgreso)} blank={blank} />
        </Section>
      </div>

      <Section letter="7" title="Condiciones de egreso y pronóstico">
        <TextBody blank={blank} value={clean(entry?.condicionesEgreso)} lines={3} />
      </Section>

      <Section letter="8" title="Médicos tratantes">
        <table className="w-full table-fixed border-collapse border-hidden text-[9px]">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col />
            <col style={{ width: '22%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr>
              {['N°', 'Nombres', 'Especialidad', 'Código', 'Periodo de responsabilidad'].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: medicoRows }, (_, i) => {
              const m = medicos[i]
              return (
                <tr key={i} className="h-5">
                  <td className={`${td} text-slate-500`}>{i + 1}</td>
                  <td className={td}>{m?.nombre ?? ''}</td>
                  <td className={td}>{m?.especialidad ?? ''}</td>
                  <td className={td}>{m?.codigo ?? ''}</td>
                  <td className={td}>{m?.periodo ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>

      <Section letter="9" title="Egreso">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 px-2 py-1.5 break-inside-avoid">
          {[...TIPOS_EGRESO, ...ESTADOS_EGRESO].map((option) => (
            <span key={option} className="flex items-center gap-1.5 text-[9.5px] text-slate-800">
              <Mark checked={entry?.tipoEgreso === option || entry?.estadoEgreso === option} /> {option}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Profesional responsable">
        <div className="break-inside-avoid">
          <CellGrid
            cols={8}
            items={[
              { label: 'Fecha (aaaa-mm-dd)', value: entry?.date ?? '' },
              { label: 'Hora (hh:mm)', value: clean(entry?.hora) },
              { label: 'Nombre del profesional', value: professionalName, span: 2 },
              { label: 'Código / registro', value: blank ? '' : professional?.registro ?? '' },
              { label: 'N° documento de identificación', value: blank ? '' : professional?.idCard ?? '' },
              { label: 'Firma', tall: true },
              { label: 'Sello', tall: true },
            ]}
          />
        </div>
      </Section>
    </div>
  )
}
