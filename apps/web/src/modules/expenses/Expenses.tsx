import { useMemo, useState } from 'react'
import { useExpenses, EXPENSE_CATEGORIES, EXPENSE_METHODS } from '../../hooks/useExpenses'
import { useAuthStore } from '../../stores/authStore'
import Modal from '../../components/ui/Modal'
import ImageUpload from '../../components/ui/ImageUpload'
import type { Expense, ExpenseInput, ExpenseCategory } from '../../types/expense'

const todayISO = () => new Date().toISOString().slice(0, 10)

const EMPTY: ExpenseInput = {
  concept: '',
  amount: 0,
  date: todayISO(),
  category: 'Alimentación',
  method: 'Efectivo',
  description: '',
  receiptFileId: null,
  receiptUrl: null,
}

interface ExpensesProps {
  showSummary?: boolean
}

export default function Expenses({ showSummary = true }: ExpensesProps) {
  const { expenses, loading, error, create, update, remove } = useExpenses()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpenseInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas')

  const filtered = useMemo(() => {
    if (categoryFilter === 'Todas') return expenses
    return expenses.filter((e) => e.category === categoryFilter)
  }, [expenses, categoryFilter])

  const total = useMemo(() => filtered.reduce((a, b) => a + (b.amount || 0), 0), [filtered])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(e: Expense) {
    setEditing(e)
    setForm({
      concept: e.concept,
      amount: e.amount,
      date: e.date,
      category: e.category,
      method: e.method,
      description: e.description ?? '',
      receiptFileId: e.receiptFileId ?? null,
      receiptUrl: e.receiptUrl ?? null,
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 }
      if (editing) {
        await update(editing.id, payload)
      } else {
        await create(payload)
      }
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(e: Expense) {
    if (confirm(`¿Eliminar gasto "${e.concept}" ($${e.amount.toFixed(2)})?`)) {
      await remove(e)
    }
  }

  return (
    <div>
      {showSummary ? (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Egresos</p>
            <p className="text-2xl font-extrabold text-rose-700">${total.toFixed(2)}</p>
          </div>
          {isAdmin && (
            <button onClick={openNew} className="btn-primary self-start sm:self-auto">+ Registrar Gasto</button>
          )}
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          {isAdmin && <button onClick={openNew} className="btn-primary">+ Registrar Gasto</button>}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-input w-full sm:w-auto"
        >
          <option>Todas</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Concepto</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Categoría</th>
                <th className="px-4 lg:px-6 py-3.5">Monto</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Método</th>
                <th className="px-4 lg:px-6 py-3.5">Comp.</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{e.id.slice(-6)}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">
                    {e.concept}
                    {e.description && <p className="text-xs font-normal text-slate-400">{e.description}</p>}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{e.category}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-bold text-slate-800">${e.amount.toFixed(2)}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{e.date}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">{e.method}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    {e.receiptFileId ? (
                      <a
                        href={`https://drive.google.com/file/d/${e.receiptFileId}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                        title="Ver comprobante"
                      >
                        📎 Ver
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(e)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay gastos registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? 'Editar Gasto' : 'Registrar Gasto'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="form-label">Concepto *</label>
            <input
              required
              value={form.concept}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
              className="form-input"
              placeholder="Ej. Compra de víveres"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Monto ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="form-input"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Método</label>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="form-input"
              >
                {EXPENSE_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Descripción / Nota</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-textarea"
              placeholder="Detalle opcional del gasto"
            />
          </div>
          <ImageUpload
            folderPath={editing ? `receipts/expenses/${editing.id}` : 'receipts/expenses/pending'}
            fileName={editing ? `expense-${editing.id}.jpg` : undefined}
            value={{ fileId: form.receiptFileId ?? null, url: form.receiptUrl ?? null }}
            onChange={({ fileId, url }) => setForm({ ...form, receiptFileId: fileId, receiptUrl: url })}
            label="Comprobante del gasto"
          />
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
              {submitting ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
