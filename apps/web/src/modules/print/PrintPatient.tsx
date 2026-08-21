import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePayments } from '../../hooks/usePayments'
import PrintLayout from '../../components/print/PrintLayout'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

export default function PrintPatient() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { payments } = usePayments()
  const patient = patients.find((p) => p.id === patientId)
  const patientPayments = payments
    .filter((p) => p.patientId === patientId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  if (!patient) {
    return (
      <PrintLayout title="Ficha de paciente">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Ficha de paciente — ${patient.name}`}>
      <div className="space-y-6 text-sm">
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Datos personales</h2>
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
          </div>
          {patient.address && (
            <div className="mt-4">
              <Row label="Dirección" value={patient.address} />
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Gestión del centro</h2>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Fecha de ingreso" value={patient.admission} />
            <Row label="Fase" value={patient.stage} />
            <Row label="Estado" value={patient.status} />
            <Row label="Doctor asignado" value={patient.assignedDoctorName ?? ''} />
            <Row label="Cuota mensual" value={patient.monthlyFee != null ? `$${patient.monthlyFee.toFixed(2)}` : ''} />
            <Row label="Próximo pago" value={patient.nextPaymentDate ?? ''} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Historial de pagos</h2>
          {patientPayments.length === 0 ? (
            <p className="text-sm text-slate-400">Sin pagos registrados.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-400">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Concepto</th>
                  <th className="py-2 pr-2">Monto</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patientPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-2">{p.date}</td>
                    <td className="py-2 pr-2">{p.concept}</td>
                    <td className="py-2 pr-2">${(p.amount ?? 0).toFixed(2)}</td>
                    <td className="py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </PrintLayout>
  )
}
