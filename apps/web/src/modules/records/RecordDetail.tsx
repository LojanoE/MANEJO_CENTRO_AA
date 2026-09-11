import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import { formatTimestamp } from '../../utils/date'
import { entryFormBadge, entryDisplaySections } from '../../utils/mspEntry'
import StatusBadge from '../../components/ui/StatusBadge'
import type { RecordEntry, MspFormType } from '../../types/medicalRecord'

type Filter = 'todas' | MspFormType | 'clasico'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: '002', label: 'MSP 002 · Consulta' },
  { id: '005', label: 'MSP 005 · Evolución' },
  { id: 'clasico', label: 'Sin migrar' },
]

export default function RecordDetail() {
  const { recordId } = useParams<{ recordId: string }>()
  const navigate = useNavigate()
  const { records, loading: recordsLoading, error: recordsError, removeEntry } = useRecords()
  const { patients } = usePatients()
  const { entries, loading, error: entriesError } = useRecordEntries(recordId)
  const { can } = usePermissions()
  const toast = useToast()
  const confirm = useConfirm()
  const [filter, setFilter] = useState<Filter>('todas')

  const record = records.find((r) => r.id === recordId)
  const patient = record ? patients.find((p) => p.id === record.patientId) : null
  const error = recordsError ?? entriesError

  // entries sorted by date ascending for timeline
  const sorted = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)), [entries])
  const visible = useMemo(
    () =>
      sorted.filter((e) => {
        if (filter === 'todas') return true
        if (filter === 'clasico') return !e.formType
        return e.formType === filter
      }),
    [sorted, filter],
  )
  const pendingCount = useMemo(() => sorted.filter((e) => !e.formType).length, [sorted])

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

  async function handleDelete(entry: RecordEntry) {
    const ok = await confirm({
      title: 'Eliminar entrada',
      message: `¿Eliminar "${entry.title}"? Esta acción no se puede deshacer.`,
    })
    if (!ok) return
    try {
      await removeEntry(entry)
      toast.success('Entrada eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la entrada.')
    }
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/records')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Fichas Médicas
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historia Clínica Única</h2>
          <p className="text-slate-500">
            {record.patientName} · {record.id.slice(-6)} · {record.doctorName ?? '—'}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <a
            href={`#/print/record/${record.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-center"
          >
            🖨️ Imprimir
          </a>
          {can('records', 'create') && (
            <>
              <button
                onClick={() => navigate(`/records/${record.id}/entry?form=002`)}
                className="btn-secondary"
              >
                + Consulta (002)
              </button>
              <button
                onClick={() => navigate(`/records/${record.id}/entry?form=005`)}
                className="btn-primary"
              >
                + Evolución (005)
              </button>
            </>
          )}
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {pendingCount} entrada(s) de esta historia aún están en el formato clásico. Se convertirán a MSP con la
          migración del Área Médica.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === f.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {f.label}
            {f.id === 'clasico' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {visible.length === 0 && !loading && (
            <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
              No hay registros en esta vista.
            </div>
          )}
          {visible.map((entry, idx) => (
            <div key={entry.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 relative">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      entry.formType === '002'
                        ? 'bg-emerald-100 text-emerald-700'
                        : entry.formType === '005'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {entry.formType === '002' ? '🩺' : entry.formType === '005' ? '📋' : '🗂️'}
                  </div>
                  {idx < visible.length - 1 && (
                    <div
                      className="absolute left-1/2 top-10 -translate-x-1/2 w-0.5 bg-slate-200"
                      style={{ height: 'calc(100% + 1rem)' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={entryFormBadge(entry)}
                        variant={entry.formType === '002' ? 'activo' : entry.formType === '005' ? 'nuevo' : 'pendiente'}
                      />
                      {entry.pendienteCompletar && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Migrado — datos por completar
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{entry.date}</span>
                    </div>
                    <div className="flex gap-1">
                      <a
                        href={`#/print/msp/${record.id}/${entry.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition text-xs"
                        title="Imprimir formulario MSP"
                      >
                        🖨️
                      </a>
                      {can('records', 'edit') && (
                        <button
                          onClick={() => navigate(`/records/${record.id}/entry/${entry.id}`)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition text-xs"
                          title="Editar entrada"
                        >
                          ✏️
                        </button>
                      )}
                      {can('records', 'delete') && (
                        <button
                          onClick={() => handleDelete(entry)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition text-xs"
                          title="Eliminar entrada"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{entry.title}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entryDisplaySections(entry).map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">{label}</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{value}</p>
                      </div>
                    ))}
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
              <Row label="Consultas (002)" value={String(sorted.filter((e) => e.formType === '002').length)} />
              <Row label="Evoluciones (005)" value={String(sorted.filter((e) => e.formType === '005').length)} />
              <Row label="Primera visita" value={sorted[0]?.date ?? formatTimestamp(record.createdAt)} />
              <Row label="Última actualización" value={formatTimestamp(record.updatedAt)} />
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
