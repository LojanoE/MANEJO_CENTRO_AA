import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import type { Expense, ExpenseInput, NewExpense } from '../types/expense'

export const EXPENSE_CATEGORIES: Expense['category'][] = [
  'Alimentación',
  'Transporte',
  'Medicinas',
  'Suministros',
  'Personal',
  'Mantenimiento',
  'Otros',
]

export const EXPENSE_METHODS = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta', '—'] as const

export function useExpenses() {
  const { data: expenses, loading, error } = useCollection<Expense>('expenses')

  const create = useCallback(async (input: ExpenseInput) => {
    const data: NewExpense = { ...input }
    const id = await saveDoc('expenses', data)
    await logActivity({
      type: 'new_expense',
      message: `Gasto registrado: ${input.concept}`,
      submessage: `${input.category} — $${input.amount.toFixed(2)}`,
      refId: id,
      color: 'bg-rose-500',
      icon: '💸',
    })
    return id
  }, [])

  const update = useCallback(async (id: string, input: ExpenseInput) => {
    await updateDocHelper('expenses', id, { ...input })
    await logActivity({
      type: 'new_expense',
      message: `Gasto actualizado: ${input.concept}`,
      submessage: `${input.category} — $${input.amount.toFixed(2)}`,
      refId: id,
      color: 'bg-blue-500',
      icon: '✏️',
    })
  }, [])

  const remove = useCallback(async (expense: Expense) => {
    await removeDoc('expenses', expense.id)
    await logActivity({
      type: 'new_expense',
      message: `Gasto eliminado`,
      submessage: `${expense.concept} — $${expense.amount.toFixed(2)}`,
      refId: expense.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  return { expenses, loading, error, create, update, remove }
}
