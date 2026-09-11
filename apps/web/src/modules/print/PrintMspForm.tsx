import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import {
  SIGNOS_VITALES_LABELS,
  EXAMEN_FISICO_LABELS,
  type MspFormType,
} from '../../types/medicalRecord'
import { entryDisplaySections, entryFormLabel } from '../../utils/mspEntry'
import { formatTimestamp } from '../../utils/date'

/**
 * Impresión de UNA entrada clínica con el diseño del formulario oficial MSP
 * (Historia Clínica Única): encabezado con código SNS-MSP/HCU, bloque de
 * identificación del paciente, secciones numeradas con borde y pie de firma.
 * Abrir en pestaña nueva y "Guardar como PDF" desde el diálogo de impresión.
 */

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Caja de sección numerada, como en el formulario papel. */
function Box({ num, title, children }: { num: string; title: string; children: ReactNode }) {
  return (
    <div className="border border-slate-400 break-inside-avoid">
      <div className="flex items-center gap-2 border-b border-slate-400 bg-slate-50 px-2 py-1 print:bg-slate-100">
        <span className="text-[10px] font-extrabold text-slate-700">{num}</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">{title}</span>
      </div>
      <div className="px-2 py-1.5 text-[11px] leading-snug text-slate-800 whitespace-pre-wrap min-h-7">{children}</div>
    </div>
  )
}

function Cell({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-slate-400 px-1.5 py-1 ${className}`}>
      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-[11px] text-slate-800">{value || '—'}</p>
    </div>
  )
}

export default function PrintMspForm() {
  const { recordId, entryId } = useParams<{ recordId: string; entryId: string }>()
  const { records, loading: recordsLoading } = useRecords()
  const { entries, loading: entriesLoading } = useRecordEntries(recordId)
  const { patients } = usePatients()
  const { settings } = useSettingsLive()

  const record = records.find((r) => r.id === recordId)
  const entry = entries.find((e) => e.id === entryId)
  const patient = record ? patients.find((p) => p.id === record.patientId) : undefined

  const loading = recordsLoading || entriesLoading
  if (!record || !entry) {
    return (
      <PrintLayout title="Formulario MSP">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Registro no encontrado.'}</p>
      </PrintLayout>
    )
  }

  const formType: MspFormType | undefined = entry.formType
  const formCode = formType ? `SNS-MSP / HCU-form.${formType} / 2020` : 'Formato clásico (sin migrar)'
  const responsable = entry.authorName ?? record.doctorName ?? '—'

  const sv = entry.signosVitales
  const examen = entry.examenFisico ?? {}
  const diagnosticos = (entry.diagnosticos ?? []).filter((d) => clean(d.descripcion) || clean(d.codigo))
  const prescripciones = (entry.prescripciones ?? []).filter((p) => clean(p.medicamento))

  return (
    <PrintLayout title={formType ? entryFormLabel(entry) : `Registro clínico — ${entry.title}`}>
      {/* Encabezado oficial: institución (letterhead de PrintLayout) + código y N° de historia */}
      <div className="mb-3 grid grid-cols-[1fr_auto_auto] border border-slate-400 text-[10px]">
        <div className="px-2 py-1 border-r border-slate-400">
          <p className="font-extrabold uppercase">{formType ? entryFormLabel(entry) : 'Registro clínico'}</p>
          <p className="text-slate-500">{settings.centerName}</p>
        </div>
        <div className="px-2 py-1 border-r border-slate-400 font-bold whitespace-nowrap">{formCode}</div>
        <div className="px-2 py-1">
          <p className="text-[8px] font-bold uppercase text-slate-500">N° de historia</p>
          <p className="font-bold">{record.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Identificación del paciente */}
      <div className="mb-3 grid grid-cols-4">
        <Cell label="Apellidos y nombres" value={patient?.name ?? record.patientName} className="col-span-2" />
        <Cell label="N° de cédula" value={patient?.idCard ?? ''} />
        <Cell label="Edad" value={patient ? `${patient.age} años` : ''} />
        <Cell label="Fecha de nacimiento" value={patient?.birthDate ?? ''} />
        <Cell label="Fecha de la atención" value={entry.date} />
        <Cell label="Fase / estado" value={patient ? `${patient.stage} · ${patient.status}` : ''} />
        <Cell label="Profesional" value={responsable} />
      </div>

      {formType === '002' && (
        <div className="space-y-0.5">
          <Box num="1" title="Motivo de consulta">{clean(entry.motivoConsulta) || '—'}</Box>
          <Box num="2" title="Antecedentes personales">{clean(entry.antecedentesPersonales) || '—'}</Box>
          <Box num="3" title="Antecedentes familiares">{clean(entry.antecedentesFamiliares) || '—'}</Box>
          <Box num="4" title="Enfermedad o problema actual">{clean(entry.enfermedadActual) || '—'}</Box>

          <div className="border border-slate-400 break-inside-avoid">
            <div className="flex items-center gap-2 border-b border-slate-400 bg-slate-50 px-2 py-1 print:bg-slate-100">
              <span className="text-[10px] font-extrabold text-slate-700">5</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Signos vitales</span>
            </div>
            <div className="grid grid-cols-4">
              {SIGNOS_VITALES_LABELS.map(({ key, label, hint }) => (
                <div key={key} className="border border-slate-300 px-1.5 py-1">
                  <p className="text-[8px] font-bold uppercase text-slate-500">
                    {label} {hint ? `(${hint})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-800">{clean(sv?.[key]) || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-400 break-inside-avoid">
            <div className="flex items-center gap-2 border-b border-slate-400 bg-slate-50 px-2 py-1 print:bg-slate-100">
              <span className="text-[10px] font-extrabold text-slate-700">6</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                Examen físico por sistemas
              </span>
            </div>
            <div>
              {EXAMEN_FISICO_LABELS.map(({ key, label }) => (
                <div key={key} className="grid grid-cols-[160px_1fr] border-b border-slate-300 last:border-b-0">
                  <p className="border-r border-slate-300 px-1.5 py-1 text-[9px] font-bold uppercase text-slate-500">
                    {label}
                  </p>
                  <p className="px-1.5 py-1 text-[11px] text-slate-800 whitespace-pre-wrap">
                    {clean(examen[key]) || '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {formType === '005' && (
        <div className="space-y-0.5">
          <Box num="1" title="Nota de evolución">{clean(entry.evolucion) || '—'}</Box>

          <div className="border border-slate-400 break-inside-avoid">
            <div className="flex items-center gap-2 border-b border-slate-400 bg-slate-50 px-2 py-1 print:bg-slate-100">
              <span className="text-[10px] font-extrabold text-slate-700">2</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Prescripciones</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-300 text-left uppercase text-slate-500">
                  <th className="px-1.5 py-1">Medicamento</th>
                  <th className="px-1.5 py-1">Dosis</th>
                  <th className="px-1.5 py-1">Vía</th>
                  <th className="px-1.5 py-1">Frecuencia</th>
                  <th className="px-1.5 py-1">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {prescripciones.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-1.5 py-2 text-slate-400">
                      Sin prescripciones.
                    </td>
                  </tr>
                )}
                {prescripciones.map((p, i) => (
                  <tr key={i}>
                    <td className="px-1.5 py-1">{p.medicamento}</td>
                    <td className="px-1.5 py-1">{p.dosis || '—'}</td>
                    <td className="px-1.5 py-1">{p.via || '—'}</td>
                    <td className="px-1.5 py-1">{p.frecuencia || '—'}</td>
                    <td className="px-1.5 py-1">{p.duracion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entrada clásica sin migrar: secciones genéricas */}
      {!formType && (
        <div className="space-y-0.5">
          {entryDisplaySections(entry).map(({ label, value }, i) => (
            <Box key={label} num={String(i + 1)} title={label}>
              {value}
            </Box>
          ))}
        </div>
      )}

      {formType && (
        <div className="mt-0.5 space-y-0.5">
          {/* Diagnósticos CIE-10 */}
          <div className="border border-slate-400 break-inside-avoid">
            <div className="flex items-center gap-2 border-b border-slate-400 bg-slate-50 px-2 py-1 print:bg-slate-100">
              <span className="text-[10px] font-extrabold text-slate-700">{formType === '002' ? '7' : '3'}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                Diagnósticos (CIE-10)
              </span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-300 text-left uppercase text-slate-500">
                  <th className="px-1.5 py-1 w-8">N°</th>
                  <th className="px-1.5 py-1">Descripción</th>
                  <th className="px-1.5 py-1 w-20">CIE-10</th>
                  <th className="px-1.5 py-1 w-14 text-center">PRE</th>
                  <th className="px-1.5 py-1 w-14 text-center">DEF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {diagnosticos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-1.5 py-2 text-slate-400">
                      Sin diagnósticos registrados.
                    </td>
                  </tr>
                )}
                {diagnosticos.map((d, i) => (
                  <tr key={i}>
                    <td className="px-1.5 py-1">{i + 1}</td>
                    <td className="px-1.5 py-1">{d.descripcion}</td>
                    <td className="px-1.5 py-1 font-mono">{d.codigo || '—'}</td>
                    <td className="px-1.5 py-1 text-center">{d.tipo === 'Presuntivo' ? '✕' : ''}</td>
                    <td className="px-1.5 py-1 text-center">{d.tipo === 'Definitivo' ? '✕' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Box num={formType === '002' ? '8' : '4'} title="Plan de tratamiento">
            {clean(entry.planTratamiento) || '—'}
          </Box>
          {formType === '002' && (
            <Box num="9" title="Evolución y pronóstico">{clean(entry.evolucion) || '—'}</Box>
          )}
          <Box num={formType === '002' ? '10' : '5'} title="Observaciones">
            {clean(entry.observaciones) || '—'}
          </Box>
        </div>
      )}

      {/* Pie oficial: responsable, firma, código */}
      <div className="mt-6 grid grid-cols-3 border border-slate-400 text-[10px] break-inside-avoid">
        <div className="px-2 py-1 border-r border-slate-400">
          <p className="text-[8px] font-bold uppercase text-slate-500">Fecha y hora</p>
          <p>{entry.date}</p>
        </div>
        <div className="px-2 py-1 border-r border-slate-400">
          <p className="text-[8px] font-bold uppercase text-slate-500">Nombre del profesional</p>
          <p>{responsable}</p>
        </div>
        <div className="px-2 py-4">
          <p className="text-[8px] font-bold uppercase text-slate-500">Firma y sello</p>
        </div>
      </div>
      <p className="mt-2 text-right text-[9px] text-slate-400">
        Historia abierta: {formatTimestamp(record.createdAt)}
      </p>
    </PrintLayout>
  )
}
