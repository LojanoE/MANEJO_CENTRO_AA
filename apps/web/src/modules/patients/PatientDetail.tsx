import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePayments } from '../../hooks/usePayments'
import { useVisits } from '../../hooks/useVisits'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { useAuthStore } from '../../stores/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import type { Payment } from '../../types/payment'
import type { Visit } from '../../types/visit'
import type { RecordEntry } from '../../types/medicalRecord'

type Tab = 'resumen' | 'pagos' | 'historial' | 'visitas'

const entryText = (val: unknown): string => (typeof val === 'string' && val.length > 0 ? val : '—')

const FIELD_LIST: { key: keyof RecordEntry; label: string }[] = [
  { key: 'anamnesis', label: 'Anamnesis' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'evaluacion', label: 'Evaluación' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'tratamiento', label: 'Tratamiento' },
  { key: 'evolucion', label: 'Evolución' },
]

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === 'admin' || user?.role === 'administrativo'

  const [tab, setTab] = useState<Tab>('resumen')

  const { patients, loading: patientsLoading } = usePatients()
  const { payments, loading: paymentsLoading } = usePayments()
  const { visits, loading: visitsLoading } = useVisits()
  const { records, loading: recordsLoading } = useRecords()

  const patient = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId])

  const patientPayments = useMemo(
    () => payments.filter((p) => p.patientId === patientId).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [payments, patientId],
  )

  const patientVisits = useMemo(
    () => visits.filter((v) => v.patientId === patientId).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [visits, patientId],
  )

  const record = useMemo(() => records.find((r) => r.patientId === patientId), [records, patientId])
  const { entries, loading: entriesLoading } = useRecordEntries(record?.id)

  const stats = useMemo(() => {
    const paid = patientPayments.filter((p) => p.status === 'Pagado').reduce((sum, p) => sum + (p.amount ?? 0), 0)
    const pending = patientPayments.filter((p) => p.status === 'Pendiente').reduce((sum, p) => sum + (p.amount ?? 0), 0)
    return {
      totalPayments: patientPayments.length,
      paid,
      pending,
      totalVisits: patientVisits.length,
      totalEntries: entries.length,
    }
  }, [patientPayments, patientVisits, entries])

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)), [entries])

  const loading = patientsLoading || paymentsLoading || visitsLoading || recordsLoading

  if (loading && !patient) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">Cargando ficha del paciente…</div>
    )
  }

  if (!patient) {
    return (
      <div>
        <button onClick={() => navigate('/patients')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition mb-4">
          ← Volver a Pacientes
        </button>
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">Paciente no encontrado.</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/patients')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Pacientes
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={patient.name} className="h-16 w-16 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl border border-slate-200">👤</div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
              <p className="text-sm text-slate-500">
                {patient.idCard ?? '—'} · {patient.phone} · Ingreso: {patient.admission}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={patient.stage} variant="custom" />
                <StatusBadge status={patient.status} />
                {patient.nextPaymentDate && (
                  <span className="status-badge bg-blue-50 text-blue-700">Próximo pago: {patient.nextPaymentDate}</span>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto">
              <button onClick={() => navigate('/finances')} className="btn-secondary text-xs w-full sm:w-auto">
                💰 Registrar pago
              </button>
              <button onClick={() => navigate('/visits')} className="btn-secondary text-xs w-full sm:w-auto">
                📅 Nueva visita
              </button>
              <button
                onClick={() => navigate(record ? `/records/${record.id}` : `/records/new/${patient.id}`)}
                className="btn-secondary text-xs w-full sm:w-auto"
              >
                📝 {record ? 'Ver ficha médica' : 'Abrir ficha médica'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 whitespace-nowrap" aria-label="Tabs">
          {[
            { key: 'resumen', label: 'Resumen' },
            { key: 'pagos', label: 'Pagos' },
            { key: 'historial', label: 'Historial clínico' },
            { key: 'visitas', label: 'Visitas' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-bold transition shrink-0
                ${tab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Resumen */}
      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pagos registrados" value={stats.totalPayments} color="emerald" />
            <StatCard label="Total pagado" value={`$${stats.paid.toFixed(2)}`} color="emerald" />
            <StatCard label="Pendiente" value={`$${stats.pending.toFixed(2)}`} color={stats.pending > 0 ? 'amber' : 'slate'} />
            <StatCard label="Visitas" value={stats.totalVisits} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3">Información general</h3>
              <div className="space-y-2.5 text-sm">
                <InfoRow label="Edad" value={`${patient.age} años`} />
                <InfoRow label="Estado civil" value={patient.maritalStatus ?? '—'} />
                <InfoRow label="Religión" value={patient.religion ?? '—'} />
                <InfoRow label="Ocupación" value={patient.occupation ?? '—'} />
                <InfoRow label="Educación" value={patient.education ?? '—'} />
                <InfoRow label="Dirección" value={patient.address ?? '—'} />
                <InfoRow label="Email" value={patient.email ?? '—'} />
                <InfoRow label="Padrino" value={patient.sponsor ?? '—'} />
                <InfoRow label="Doctor asignado" value={patient.assignedDoctorName ?? '—'} />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3">Resumen médico y visitas</h3>
              <div className="space-y-2.5 text-sm">
                <InfoRow label="Ficha médica" value={record ? 'Abierta' : 'Sin abrir'} />
                <InfoRow label="Entradas clínicas" value={String(stats.totalEntries)} />
                <InfoRow label="Última actualización" value={record?.updatedAt ?? '—'} />
                <InfoRow label="Próximo pago" value={patient.nextPaymentDate ?? '—'} />
                <InfoRow label="Cuota mensual" value={`$${(patient.monthlyFee ?? 0).toFixed(2)}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagos */}
      {tab === 'pagos' && (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                  <th className="px-4 lg:px-6 py-3.5">Fecha</th>
                  <th className="px-4 lg:px-6 py-3.5">Concepto</th>
                  <th className="px-4 lg:px-6 py-3.5">Monto</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Método</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Próximo pago</th>
                  <th className="px-4 lg:px-6 py-3.5">Estado</th>
                  <th className="px-4 lg:px-6 py-3.5">Comp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patientPayments.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
                {patientPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                      No hay pagos registrados para este paciente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial clínico */}
      {tab === 'historial' && (
        <div>
          {!record && (
            <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500 mb-6">
              <p className="mb-4">Este paciente aún no tiene ficha médica abierta.</p>
              {canManage && (
                <button onClick={() => navigate(`/records/new/${patient.id}`)} className="btn-primary">
                  Abrir ficha médica
                </button>
              )}
            </div>
          )}

          {record && entriesLoading && (
            <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">Cargando entradas…</div>
          )}

          {record && !entriesLoading && sortedEntries.length === 0 && (
            <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500 mb-6">
              La ficha médica está abierta pero aún no tiene entradas.
            </div>
          )}

          <div className="space-y-4">
            {sortedEntries.map((entry, idx) => (
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
                    {idx < sortedEntries.length - 1 && (
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
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{entryText(entry[key])}</p>
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
        </div>
      )}

      {/* Visitas */}
      {tab === 'visitas' && (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                  <th className="px-4 lg:px-6 py-3.5">Fecha</th>
                  <th className="px-4 lg:px-6 py-3.5">Hora</th>
                  <th className="px-4 lg:px-6 py-3.5">Visitante</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Tipo</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Médico</th>
                  <th className="px-4 lg:px-6 py-3.5">Estado</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patientVisits.map((v) => (
                  <VisitRow key={v.id} visit={v} />
                ))}
                {patientVisits.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                      No hay visitas registradas para este paciente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: 'emerald' | 'blue' | 'amber' | 'slate' }) {
  const colorClass = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
  }[color]

  return (
    <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${colorClass}`}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  )
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <tr className="table-row">
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500">{payment.date}</td>
      <td className="px-4 lg:px-6 py-3.5 text-slate-600">{payment.concept}</td>
      <td className="px-4 lg:px-6 py-3.5 font-bold text-slate-800">${(payment.amount ?? 0).toFixed(2)}</td>
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden md:table-cell">{payment.method}</td>
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{payment.nextPaymentDate ?? '—'}</td>
      <td className="px-4 lg:px-6 py-3.5">
        <StatusBadge status={payment.status} />
      </td>
      <td className="px-4 lg:px-6 py-3.5">
        {payment.receiptUrl ? (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
          >
            📎 Ver
          </a>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
    </tr>
  )
}

function VisitRow({ visit }: { visit: Visit }) {
  return (
    <tr className="table-row">
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500">{visit.date}</td>
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500">{visit.time}</td>
      <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{visit.visitor}</td>
      <td className="px-4 lg:px-6 py-3.5 hidden md:table-cell">
        <StatusBadge status={visit.type} variant="custom" />
      </td>
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{visit.doctorName ?? '—'}</td>
      <td className="px-4 lg:px-6 py-3.5">
        <StatusBadge status={visit.status} />
      </td>
      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell max-w-xs truncate">{visit.notes ?? '—'}</td>
    </tr>
  )
}
