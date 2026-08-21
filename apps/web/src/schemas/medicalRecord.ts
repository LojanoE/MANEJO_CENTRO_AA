import { z } from 'zod'
import type { RecordEntryInput } from '../types/medicalRecord'

const schema = z.object({
  title: z.string().trim().min(2, 'El título debe tener al menos 2 caracteres.'),
  date: z.string().min(1, 'La fecha es obligatoria.'),
})

/** Returns the first validation error message, or null if the input is valid. */
export function validateRecordEntryInput(input: RecordEntryInput): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : result.error.issues[0]?.message ?? 'Datos inválidos.'
}
