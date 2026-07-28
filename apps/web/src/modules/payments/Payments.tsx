import { useMemo, useState } from 'react'
import { usePayments, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../hooks/usePayments'
import { useAuthStore } from '../../stores/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import PatientSelect from '../../components/ui/PatientSelect'
import type { Payment, PaymentInput, PaymentStatus, PaymentMethod } from '../../types/payment'

const todayISO = () => new Date().toISOString().slice(0, 10)

const EMPTY: PaymentInput = {
  patientId: null,
  concept: 'Cuota mensual',
  amount: 150,
  date: todayISO(),
  status: 'Pagado',
  method: 'Efectivo',
}

export default function Payments() {
  const { payments, patients, loading, error, create, markStatus, remove } = usePayments()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PaymentInput>(EMPTY)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === 'Pagado').reduce((a, b) => a + (b.amount || 0), 0)
    const pending = payments.filter((p) => p.status === 'Pendiente').reduce((a, b) => a + (b.amount || 0), 0)
    return { paid, pending }
  }, [payments])

  function openNew() {
    setForm(EMPTY)
    setReceipt(null)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await create({ ...form, amount: Number(form.amount) || 0 }, receipt ?? undefined)
      setOpen(false)
      setReceipt(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFormError('El comprobante no debe superar 5MB')
      return
    }
    setReceipt(file)
  }

  async function handleDelete(p: Payment) {
    if (confirm(`¿Eliminar pago de ${p.patientName} ($${p.amount.toFixed(2)})?`)) {
      await remove(p)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pagos y Cuotas</h2>
          <p className="text-slate-500">Gestión financiera de residentes</p>
        </div>
        <button onClick={openNew} className="btn-primary self-start sm:self-auto">+ Registrar Pago</button>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Recaudado</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">${totals.paid.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400">Pagos confirmados</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendiente de Cobro</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">${totals.pending.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400">Cuotas por vencer</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cuota Mensual</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-700">$150.00</p>
          <p className="mt-1 text-xs text-slate-400">Monto estándar</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Paciente</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Concepto</th>
                <th className="px-4 lg:px-6 py-3.5">Monto</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Método</th>
                <th className="px-4 lg:px-6 py-3.5">Estado</th>
                <th className="px-4 lg:px-6 py-3.5">Comprobante</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{p.id.slice(-6)}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{p.patientName}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{p.concept}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-bold text-slate-800">${p.amount.toFixed(2)}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{p.date}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">{p.method}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        Ver comprobante →
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {p.status === 'Pendiente' && (
                        <button
                          onClick={() => markStatus(p, 'Pagado')}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          Marcar pagado
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay pagos registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Registrar Pago" onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="form-label">Paciente *</label>
            <PatientSelect
              patients={patients}
              value={form.patientId}
              onChange={(patientId) => setForm({ ...form, patientId })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Concepto</label>
              <input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Monto ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Método</label>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                className="form-input"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })}
                className="form-input"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Comprobante de pago (opcional, máx. 5MB)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceipt}
                className="form-input py-2"
              />
              {receipt && (
                <p className="mt-1 text-xs text-emerald-600">✓ Archivo seleccionado: {receipt.name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : 'Registrar Pago'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}