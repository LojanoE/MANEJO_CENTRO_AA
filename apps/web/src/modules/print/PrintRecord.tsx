import { useParams } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import PrintLayout from '../../components/print/PrintLayout'
import type { RecordEntry } from '../../types/medicalRecord'

const entryText = (val: unknown): string => (typeof val === 'string' && val.length > 0 ? val : '—')

const FIELD_LIST: { key: keyof RecordEntry; label: string }[] = [
  { key: 'anamnesis', label: 'Anamnesis' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'evaluacion', label: 'Evaluación' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'tratamiento', label: 'Tratamiento' },
  { key: 'evolucion', label: 'Evolución' },
  { key: 'observaciones', label: 'Observaciones' },
]

export default function PrintRecord() {
  const { recordId } = useParams<{ recordId: string }>()
  const { records, loading: recordsLoading } = useRecords()
  const { entries, loading: entriesLoading } = useRecordEntries(recordId)
  const record = records.find((r) => r.id === recordId)
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))

  if (!record) {
    return (
      <PrintLayout title="Historia clínica">
        <p className="text-sm text-slate-500">{recordsLoading ? 'Cargando…' : 'Ficha no encontrada.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Historia clínica — ${record.patientName}`}>
      <p className="mb-6 text-xs text-slate-500">
        Médico responsable: {record.doctorName ?? '—'} · Ficha abierta: {String(record.createdAt).slice(0, 10)}
      </p>

      {entriesLoading && <p className="text-sm text-slate-400">Cargando entradas…</p>}
      {!entriesLoading && sorted.length === 0 && (
        <p className="text-sm text-slate-400">Sin entradas registradas.</p>
      )}

      <div className="space-y-8">
        {sorted.map((entry, idx) => (
          <section key={entry.id} className="break-inside-avoid">
            <div className="mb-2 flex items-baseline justify-between border-b border-slate-200 pb-1">
              <h3 className="text-sm font-bold text-slate-800">
                {idx + 1}. {entry.title} <span className="font-normal text-slate-400">({entry.type})</span>
              </h3>
              <span className="text-xs text-slate-400">{entry.date}</span>
            </div>
            <dl className="space-y-2 text-sm">
              {FIELD_LIST.map(({ key, label }) => (
                <div key={key}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                  <dd className="whitespace-pre-wrap text-slate-700">{entryText(entry[key])}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </PrintLayout>
  )
}
