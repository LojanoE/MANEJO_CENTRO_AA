import { useParams } from 'react-router-dom'
import { usePayments } from '../../hooks/usePayments'
import PrintLayout from '../../components/print/PrintLayout'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-slate-200 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value || '—'}</span>
    </div>
  )
}

export default function PrintPayment() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const { payments, loading } = usePayments()
  const payment = payments.find((p) => p.id === paymentId)

  if (!payment) {
    return (
      <PrintLayout title="Recibo de pago">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Pago no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title="Recibo de pago">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wider text-slate-400">Recibo N.º</p>
        <p className="font-mono text-lg font-bold text-slate-800">{payment.id.slice(-8).toUpperCase()}</p>
      </div>

      <Row label="Paciente" value={payment.patientName} />
      <Row label="Concepto" value={payment.concept} />
      <Row label="Fecha" value={payment.date} />
      <Row label="Método de pago" value={payment.method} />
      <Row label="Estado" value={payment.status} />
      {payment.nextPaymentDate && <Row label="Próximo pago" value={payment.nextPaymentDate} />}

      <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-4 text-center">
        <p className="text-xs uppercase tracking-wider text-emerald-700">Monto</p>
        <p className="text-3xl font-extrabold text-emerald-800">${(payment.amount ?? 0).toFixed(2)}</p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
        <div className="border-t border-slate-300 pt-2">Firma responsable</div>
        <div className="border-t border-slate-300 pt-2">Recibido por</div>
      </div>
    </PrintLayout>
  )
}
