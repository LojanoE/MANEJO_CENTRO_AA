import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientOccupational } from '../../hooks/useOccupational'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatTimestamp } from '../../utils/date'
import { hcNumber } from '../../utils/clinicalPrint'
import { occupationalTotals } from '../../utils/occupational'
import type { OccupationalEntry } from '../../types/occupational'

/** Expediente ocupacional de un paciente: sus evaluaciones por criterios en el tiempo. */
export default function OccupationalPatient() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { patients, loading } = usePatients()
  const { can } = usePermissions()
  const toast = useToast()
  const confirm = useConfirm()
  const patient = patients.find((p) => p.id === patientId)
  const { entries, loading: entriesLoading, remove } = usePatientOccupational(patient)

  if (!patient) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {loading ? 'Cargando…' : 'Paciente no encontrado.'}
      </div>
    )
  }

  async function handleDelete(entry: OccupationalEntry) {
    const ok = await confirm({ title: 'Eliminar evaluación', message: '¿Eliminar esta evaluación ocupacional? No se puede deshacer.' })
    if (!ok) return
    try {
      await remove(entry)
      toast.success('Evaluación eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la evaluación.')
    }
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/occupational')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Terapia Ocupacional
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
            <p className="text-sm text-slate-500">
              N° HC {hcNumber(patient) || '—'} · {patient.age} años · Ingreso: {patient.admission}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={patient.stage} variant="custom" />
              <StatusBadge status={patient.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('patients', 'viewDetail') && (
              <button onClick={() => navigate(`/patients/${patient.id}`)} className="btn-secondary text-xs">
                👤 Ficha del paciente
              </button>
            )}
            {can('medical', 'view') && (
              <button onClick={() => navigate(`/medical/formatos?paciente=${patient.id}`)} className="btn-secondary text-xs">
                🗂️ Formatos
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{entries.length} evaluaciones registradas</p>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <a href={`#/print/occupational/${patient.id}`} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center text-xs">
              🖨️ Imprimir última
            </a>
          )}
          {can('occupational', 'create') && (
            <button onClick={() => navigate(`/occupational/${patient.id}/evaluacion`)} className="btn-primary text-xs">
              + Nueva evaluación
            </button>
          )}
        </div>
      </div>

      {entriesLoading ? (
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">Cargando evaluaciones…</div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
          <p className="text-4xl">🧩</p>
          <p className="mt-3 font-bold text-slate-800">Aún no tiene evaluación ocupacional</p>
          <p className="mt-1 text-sm text-slate-500">Coordinación, atención, actividades de la vida diaria y componente cognitivo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const totals = occupationalTotals(entry.answers)
            return (
              <div key={entry.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatTimestamp(entry.createdAt)} · {entry.authorName ?? '—'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="status-badge status-activo">✔ Cumple: {totals.c}</span>
                      <span className="status-badge bg-amber-100 text-amber-700">✖ No cumple: {totals.nc}</span>
                      <span className="status-badge bg-slate-100 text-slate-600">— No aplica: {totals.na}</span>
                      <span className="text-slate-400">de {totals.total} criterios</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a
                      href={`#/print/occupational/${patient.id}/${entry.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                      title="Imprimir"
                    >
                      🖨️
                    </a>
                    {can('occupational', 'edit') && (
                      <button
                        onClick={() => navigate(`/occupational/${patient.id}/evaluacion/${entry.id}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Editar"
                      >
                        ✏️
                      </button>
                    )}
                    {can('occupational', 'delete') && (
                      <button onClick={() => handleDelete(entry)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Eliminar">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
