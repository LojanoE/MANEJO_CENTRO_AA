import { z } from 'zod'
import type { ExpenseInput } from '../types/expense'

const schema = z.object({
  concept: z.string().trim().min(1, 'El concepto es obligatorio.'),
  amount: z.number().positive('El monto debe ser mayor a cero.'),
  date: z.string().min(1, 'La fecha es obligatoria.'),
})

/** Returns the first validation error message, or null if the input is valid. */
export function validateExpenseInput(input: ExpenseInput): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : result.error.issues[0]?.message ?? 'Datos inválidos.'
}
