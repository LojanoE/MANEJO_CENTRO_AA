import { z } from 'zod'
import type { RecordEntryInput } from '../types/medicalRecord'

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const schema = z.object({
  title: z.string().trim().min(2, 'El título debe tener al menos 2 caracteres.'),
  date: z.string().min(1, 'La fecha es obligatoria.'),
  hora: z
    .string()
    .optional()
    .refine((h) => !h || HORA_RE.test(h), 'La hora debe tener el formato HH:MM.'),
  formType: z.enum(['002', '005', '006'], { message: 'Seleccione el formulario MSP.' }),
})

/** Returns the first validation error message, or null if the input is valid. */
export function validateRecordEntryInput(input: RecordEntryInput): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : result.error.issues[0]?.message ?? 'Datos inválidos.'
}
