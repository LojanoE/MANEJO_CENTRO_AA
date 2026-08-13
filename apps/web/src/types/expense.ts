export type ExpenseCategory =
  | 'Alimentación'
  | 'Transporte'
  | 'Medicinas'
  | 'Suministros'
  | 'Personal'
  | 'Mantenimiento'
  | 'Otros'

export interface Expense {
  id: string
  concept: string
  amount: number
  date: string // ISO yyyy-mm-dd
  category: ExpenseCategory
  method: string
  description?: string
  receiptFileId?: string | null
  receiptUrl?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewExpense = Omit<Expense, 'id'>
export type ExpenseInput = Omit<NewExpense, 'createdAt' | 'updatedAt'>
