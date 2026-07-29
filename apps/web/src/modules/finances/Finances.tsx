import { useMemo, useState } from 'react'
import { usePayments } from '../../hooks/usePayments'
import { useExpenses } from '../../hooks/useExpenses'
import Incomes from './Incomes'
import Expenses from '../expenses/Expenses'

type Tab = 'incomes' | 'expenses'

export default function Finances() {
  const [tab, setTab] = useState<Tab>('incomes')
  const { payments } = usePayments()
  const { expenses } = useExpenses()

  const totals = useMemo(() => {
    const income = payments.filter((p) => p.status === 'Pagado').reduce((a, b) => a + (b.amount || 0), 0)
    const expense = expenses.reduce((a, b) => a + (b.amount || 0), 0)
    return { income, expense, balance: income - expense }
  }, [payments, expenses])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Finanzas</h2>
        <p className="text-slate-500">Ingresos, egresos y saldo del centro</p>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ingresos</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">${totals.income.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400">Pagos recibidos</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Egresos</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-700">${totals.expense.toFixed(2)}</p>
          <p className="mt-1 text-xs text-slate-400">Gastos del centro</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo</p>
          <p className={`mt-2 text-2xl font-extrabold ${totals.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            ${totals.balance.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Ingresos − Egresos</p>
        </div>
      </div>

      <div className="mb-4 border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setTab('incomes')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-bold transition
              ${tab === 'incomes'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setTab('expenses')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-bold transition
              ${tab === 'expenses'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
          >
            Egresos
          </button>
        </nav>
      </div>

      {tab === 'incomes' ? <Incomes /> : <Expenses showSummary={false} />}
    </div>
  )
}
