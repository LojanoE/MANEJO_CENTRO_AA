import { useParams, useNavigate } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import StatusBadge from '../../components/ui/StatusBadge'
import type { RecordEntry } from '../../types/medicalRecord'

const entryText = (val: unknown): string => (typeof val === 'string' && val.length > 0 ? val : '—')

const FIELD_LIST: { key: keyof RecordEntry; label: string }[] = [
  { key: 'anamnesis', label: 'Anamnesis' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'evaluacion', label: 'Evaluación' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'tratamiento', label: 'Tratamiento' },
  { key: 'evolucion', label: 'Evolución' },
]

export default function RecordDetail() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const { records, loading: recordsLoading, error: recordsError } = useRecords()
  const { patients } = usePatients()
  const { entries, loading, error: entriesError } = useRecordEntries(recordId)

  const record = records.find((r) => r.id === recordId)
  const patient = record ? patients.find((p) => p.id === record.patientId) : null
  const error = recordsError ?? entriesError

  if (!record) {
    return (
      <div>
        <button onClick={() => navigate('/records')} className="text-sm text-emerald-700 hover:underline mb-4">← Volver</button>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
          {recordsLoading ? 'Cargando ficha…' : 'Ficha no encontrada.'}
        </div>
      </div>
    )
  }

  // entries sorted by date ascending for timeline
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/records')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Fichas Médicas
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historial Clínico</h2>
          <p className="text-slate-500">
            {record.patientName} · {record.id.slice(-6)} · {record.doctorName ?? '—'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/records/${record.id}/entry`)}
          className="btn-primary self-start sm:self-auto"
        >
          + Nueva Entrada
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {sorted.length === 0 && !loading && (
            <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
              Aún no hay entradas en este historial.
            </div>
          )}
          {sorted.map((entry, idx) => (
            <div key={entry.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 relative">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      entry.type === 'Apertura' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {entry.type === 'Apertura' ? '📋' : '📝'}
                  </div>
                  {idx < sorted.length - 1 && (
                    <div
                      className="absolute left-1/2 top-10 -translate-x-1/2 w-0.5 bg-slate-200"
                      style={{ height: 'calc(100% + 1rem)' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge status={entry.type} variant={entry.type === 'Apertura' ? 'activo' : 'nuevo'} />
                    <span className="text-xs text-slate-400">{entry.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{entry.title}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FIELD_LIST.map(({ key, label }) => (
                      <div key={key} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">{label}</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {entryText(entry[key])}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-xs font-bold uppercase text-amber-600 mb-1">Observaciones</p>
                    <p className="text-sm text-amber-800 whitespace-pre-wrap">{entry.observaciones || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-3">Información del Paciente</h3>
            <div className="space-y-2.5 text-sm">
              <Row label="Nombre" value={patient?.name ?? record.patientName} />
              <Row label="Edad" value={patient ? `${patient.age} años` : '—'} />
              <Row label="Fase" value={patient?.stage ?? '—'} badge />
              <Row label="Ingreso" value={patient?.admission ?? '—'} />
              <Row label="Doctor" value={record.doctorName ?? '—'} />
              <Row label="Padrino" value={patient?.sponsor ?? '—'} />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-3">Resumen del Historial</h3>
            <div className="space-y-2">
              <Row label="Total entradas" value={String(entries.length)} />
              <Row label="Primera visita" value={sorted[0]?.date ?? record.createdAt} />
              <Row label="Última actualización" value={record.updatedAt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      {badge ? (
        <StatusBadge status={value} variant="custom" />
      ) : (
        <span className="font-semibold text-slate-800 text-right">{value}</span>
      )}
    </div>
  )
}