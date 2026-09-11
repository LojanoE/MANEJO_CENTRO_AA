import { todayISO } from '../../utils/date'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useProfessionals } from '../../hooks/useProfessionals'
import { usePatientAdmissions } from '../../hooks/useAdmissions'
import type { RecordEntryInput, MspFormType, TipoEgreso } from '../../types/medicalRecord'
import type { PatientStatus } from '../../types/patient'
import { MSP_FORM_LABELS } from '../../types/medicalRecord'
import { validateRecordEntryInput } from '../../schemas/medicalRecord'
import MspEntryFields from './MspEntryFields'
import { currentTimeHHMM } from '../../utils/clinicalPrint'
import { buildEpicrisisDraft } from '../../utils/epicrisis'

const EMPTY: RecordEntryInput = {
  recordId: '',
  date: todayISO(),
  formType: '002',
  title: '',
  motivoConsulta: '',
  enfermedadActual: '',
  antecedentesPersonales: '',
  antecedentesFamiliares: '',
  signosVitales: undefined,
  examenFisico: {},
  diagnosticos: [],
  evolucion: '',
  prescripciones: [],
  planTratamiento: '',
  observaciones: '',
}

/** Egresos tras los que el paciente no queda "de alta" sino inactivo. */
const INACTIVE_EXITS: TipoEgreso[] = ['Retiro no autorizado', 'Defunción menos de 48 horas', 'Defunción más de 48 horas']

function parseFormParam(value: string | null): MspFormType {
  return value === '005' || value === '006' ? value : '002'
}

export default function RecordEntryForm() {
  const { recordId, entryId } = useParams<{ recordId: string; entryId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addEntry, updateEntry, records } = useRecords()
  const { entries, loading: entriesLoading } = useRecordEntries(recordId)
  const { patients, update: updatePatient } = usePatients()
  const { professionals, loading: professionalsLoading } = useProfessionals()
  const record = records.find((r) => r.id === recordId)
  const patient = record ? patients.find((p) => p.id === record.patientId) : undefined
  const { closeOpenAdmission } = usePatientAdmissions(patient)
  const editingEntry = entryId ? entries.find((e) => e.id === entryId) : undefined
  const isEditing = Boolean(entryId)

  // Al crear, el formulario puede venir fijado desde el Área Médica o la
  // historia (?form=005, ?form=006). Al editar, manda el formType de la entrada.
  const initialForm = parseFormParam(searchParams.get('form'))
  const initial = useMemo<RecordEntryInput>(
    () => ({ ...EMPTY, formType: initialForm, hora: currentTimeHHMM(), tipoConsulta: 'Subsecuente' }),
    [initialForm],
  )

  const [form, setForm] = useState<RecordEntryInput>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closeAdmission, setCloseAdmission] = useState(true)
  const [draftReady, setDraftReady] = useState(false)

  // Prefill once the entry to edit has loaded from the live subscription.
  useEffect(() => {
    if (!editingEntry) return
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, authorId: _a, authorName: _an, ...rest } = editingEntry
    // La hora y el tipo de consulta se toman de la entrada: las anteriores a la
    // Fase 1 no los tienen y no deben heredar los valores por defecto de una nueva.
    const { hora: _hora, tipoConsulta: _tipo, ...base } = initial
    setForm({ ...base, ...rest, hora: editingEntry.hora ?? '', formType: editingEntry.formType ?? initialForm })
  }, [editingEntry, initial, initialForm])

  // Epicrisis nueva: borrador con lo registrado en la historia clínica, una sola
  // vez y cuando ya cargaron las entradas, el paciente y los profesionales.
  const draftApplied = useRef(false)
  useEffect(() => {
    if (isEditing || initialForm !== '006' || draftApplied.current) return
    if (entriesLoading || professionalsLoading || !record || !patient) return
    draftApplied.current = true
    setForm((f) => ({ ...f, ...buildEpicrisisDraft({ patient, entries, professionals }) }))
    setDraftReady(true)
  }, [isEditing, initialForm, entriesLoading, professionalsLoading, record, patient, entries, professionals])

  const isNewEpicrisis = !isEditing && form.formType === '006'
  const previousEpicrisis = isNewEpicrisis ? entries.find((e) => e.formType === '006') : undefined
  const dischargeStatus: PatientStatus = form.tipoEgreso && INACTIVE_EXITS.includes(form.tipoEgreso) ? 'Inactivo' : 'Alta'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const validationError = validateRecordEntryInput(form)
    if (validationError) {
      setError(validationError)
      setSubmitting(false)
      return
    }
    try {
      if (isEditing && editingEntry) {
        await updateEntry(editingEntry, form)
      } else {
        const newId = await addEntry(recordId!, form)
        // La epicrisis cierra el internamiento: egreso en la admisión (MSP 001) y estado del paciente.
        if (form.formType === '006' && closeAdmission && patient) {
          await closeOpenAdmission({
            dischargeDate: form.fechaEgreso || todayISO(),
            dischargeType: form.tipoEgreso ?? null,
            epicrisisEntryId: newId,
          })
          if (patient.status !== dischargeStatus) await updatePatient(patient.id, { status: dischargeStatus })
        }
      }
      navigate(`/records/${recordId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar entrada')
      setSubmitting(false)
    }
  }

  if (isEditing && !editingEntry) {
    return (
      <div>
        <button onClick={() => navigate(`/records/${recordId}`)} className="text-sm text-emerald-700 hover:underline mb-4">← Volver</button>
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
          Cargando entrada…
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate(`/records/${recordId}`)} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver al Historial
        </button>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          {isEditing ? 'Editar registro' : 'Nuevo registro'} · {MSP_FORM_LABELS[form.formType ?? '002']}
        </h2>
        <p className="text-slate-500">
          {record?.patientName ?? '—'} · Historia Clínica Única MSP
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        {editingEntry?.pendienteCompletar && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
            Registro migrado del formato anterior: los datos que no existían quedaron en blanco.
            Complete signos vitales, CIE-10 o lo que necesite y guarde.
          </div>
        )}
        {isNewEpicrisis && (
          <div className="mb-4 rounded-xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-sm text-sky-800">
            {draftReady
              ? 'Borrador generado con la historia clínica: fechas, cuadro clínico, evolución, tratamiento, diagnósticos de ingreso y egreso, y médicos tratantes. Revíselo y corríjalo antes de guardar.'
              : 'Preparando el borrador con la historia clínica…'}
          </div>
        )}
        {previousEpicrisis && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
            <span>
              Este paciente ya tiene una epicrisis (egreso {previousEpicrisis.fechaEgreso ?? previousEpicrisis.date}). Continúe solo si
              corresponde a un nuevo internamiento.
            </span>
            <button
              type="button"
              onClick={() => navigate(`/records/${recordId}/entry/${previousEpicrisis.id}`, { replace: true })}
              className="btn-secondary text-xs self-start sm:self-auto"
            >
              Editar la existente
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <MspEntryFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} allowFormSwitch={!isEditing} />

          {isNewEpicrisis && patient && (
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={closeAdmission}
                onChange={(e) => setCloseAdmission(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <strong>Cerrar el internamiento</strong>: registrar el egreso en la admisión (MSP 001) y cambiar el estado de{' '}
                {patient.name} a <strong>{dischargeStatus}</strong>.
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Guardar Registro'}
            </button>
            <button type="button" onClick={() => navigate(`/records/${recordId}`)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
