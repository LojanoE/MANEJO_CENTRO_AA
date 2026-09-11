import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePayments } from '../../hooks/usePayments'
import { useVisits } from '../../hooks/useVisits'
import { useMedicalAuths } from '../../hooks/useMedicalAuths'
import { useTasks } from '../../hooks/useTasks'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { useAuthStore } from '../../stores/authStore'
import PrintLayout from '../../components/print/PrintLayout'
import { buildDossier } from '../../utils/patientDossier'
import { entryFormLabel, entryDisplaySections } from '../../utils/mspEntry'
import { formatTimestamp } from '../../utils/date'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-slate-500">{children}</p>
}

/**
 * Full patient dossier for audits: personal data, the complete clinical history
 * (every entry with its treatment), payments, visits, authorizations and tasks,
 * stamped with who exported it and when.
 */
export default function PrintPatientFile() {
  const { patientId } = useParams<{ patientId: string }>()
  const exportedBy = useAuthStore((s) => s.user)

  const { patients, loading: patientsLoading } = usePatients()
  const { payments } = usePayments()
  const { visits } = useVisits()
  const { auths } = useMedicalAuths()
  const { tasks } = useTasks()
  const { records } = useRecords()

  const patient = patients.find((p) => p.id === patientId)
  const record = records.find((r) => r.patientId === patientId) ?? null
  const { entries, loading: entriesLoading } = useRecordEntries(record?.id)

  if (!patient) {
    return (
      <PrintLayout title="Expediente completo">
        <p className="text-sm text-slate-500">{patientsLoading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  const dossier = buildDossier(patient, {
    records,
    entriesByRecord: record ? new Map([[record.id, entries]]) : new Map(),
    payments,
    visits,
    auths,
    tasks,
  })

  return (
    <PrintLayout title={`Expediente completo — ${patient.name}`}>
      <div className="space-y-6 text-sm">
        <Section title="Datos personales">
          <div className="grid grid-cols-2 gap-4">
            <Row label="Nombre completo" value={patient.name} />
            <Row label="Cédula" value={patient.idCard ?? ''} />
            <Row label="Fecha de nacimiento" value={patient.birthDate ?? ''} />
            <Row label="Edad" value={String(patient.age)} />
            <Row label="Estado civil" value={patient.maritalStatus ?? ''} />
            <Row label="Religión" value={patient.religion ?? ''} />
            <Row label="Teléfono" value={patient.phone} />
            <Row label="Email" value={patient.email ?? ''} />
            <Row label="Ocupación" value={patient.occupation ?? ''} />
            <Row label="Instrucción" value={patient.education ?? ''} />
            <Row label="Padrino" value={patient.sponsor ?? ''} />
            <Row label="Dirección" value={patient.address ?? ''} />
          </div>
        </Section>

        <Section title="Gestión del centro">
          <div className="grid grid-cols-2 gap-4">
            <Row label="Fecha de ingreso" value={patient.admission} />
            <Row label="Fase" value={patient.stage} />
            <Row label="Estado" value={patient.status} />
            <Row label="Médico asignado" value={patient.assignedDoctorName ?? ''} />
            <Row label="Cuota mensual" value={patient.monthlyFee != null ? `$${patient.monthlyFee.toFixed(2)}` : ''} />
            <Row label="Próximo pago" value={patient.nextPaymentDate ?? ''} />
          </div>
        </Section>

        <Section title="Historia clínica">
          {record && (
            <p className="mb-4 text-xs text-slate-500">
              Médico responsable: {record.doctorName ?? '—'} · Ficha abierta:{' '}
              {formatTimestamp(record.createdAt)}
            </p>
          )}
          {entriesLoading && <Empty>Cargando entradas…</Empty>}
          {!entriesLoading && dossier.entries.length === 0 && (
            <Empty>Sin entradas clínicas registradas.</Empty>
          )}
          <div className="space-y-6">
            {dossier.entries.map((entry, idx) => (
              <div key={entry.id} className="break-inside-avoid">
                <div className="mb-2 flex items-baseline justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-sm font-bold text-slate-800">
                    {idx + 1}. {entry.title} <span className="font-normal text-slate-500">({entryFormLabel(entry)})</span>
                  </h3>
                  <span className="text-xs text-slate-500">{entry.date}</span>
                </div>
                <dl className="space-y-2 text-sm">
                  {entryDisplaySections(entry).map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                      <dd className="whitespace-pre-wrap text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Historial de pagos">
          {dossier.payments.length === 0 ? (
            <Empty>Sin pagos registrados.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Concepto</th>
                  <th className="py-2 pr-2">Monto</th>
                  <th className="py-2 pr-2">Método</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dossier.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-2">{p.date}</td>
                    <td className="py-2 pr-2">{p.concept}</td>
                    <td className="py-2 pr-2">${(p.amount ?? 0).toFixed(2)}</td>
                    <td className="py-2 pr-2">{p.method}</td>
                    <td className="py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Visitas recibidas">
          {dossier.visits.length === 0 ? (
            <Empty>Sin visitas registradas.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Hora</th>
                  <th className="py-2 pr-2">Visitante</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dossier.visits.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 pr-2">{v.date}</td>
                    <td className="py-2 pr-2">{v.time}</td>
                    <td className="py-2 pr-2">{v.visitor}</td>
                    <td className="py-2 pr-2">{v.type}</td>
                    <td className="py-2">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Autorizaciones médicas">
          {dossier.auths.length === 0 ? (
            <Empty>Sin autorizaciones registradas.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Médico</th>
                  <th className="py-2 pr-2">Estado</th>
                  <th className="py-2">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dossier.auths.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-2">{a.date}</td>
                    <td className="py-2 pr-2">{a.type}</td>
                    <td className="py-2 pr-2">{a.doctorName ?? '—'}</td>
                    <td className="py-2 pr-2">{a.status}</td>
                    <td className="py-2 whitespace-pre-wrap">{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Tareas asociadas">
          {dossier.tasks.length === 0 ? (
            <Empty>Sin tareas asociadas.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                  <th className="py-2 pr-2">Título</th>
                  <th className="py-2 pr-2">Categoría</th>
                  <th className="py-2 pr-2">Asignada a</th>
                  <th className="py-2 pr-2">Vence</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dossier.tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-2">{t.title}</td>
                    <td className="py-2 pr-2">{t.category}</td>
                    <td className="py-2 pr-2">{t.assignedToName ?? '—'}</td>
                    <td className="py-2 pr-2">{t.dueDate ?? '—'}</td>
                    <td className="py-2">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <footer className="break-inside-avoid border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>
            Expediente exportado por <span className="font-semibold text-slate-700">{exportedBy?.name ?? '—'}</span>
            {exportedBy?.role ? ` (${exportedBy.role})` : ''} el{' '}
            {new Date().toLocaleString('es', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
          <p className="mt-1">
            Documento confidencial: contiene datos clínicos sujetos a reserva. Entregar únicamente a quien
            corresponda.
          </p>
        </footer>
      </div>
    </PrintLayout>
  )
}
