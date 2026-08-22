import { z } from 'zod'
import type { PaymentInput } from '../types/payment'

const schema = z
  .object({
    patientId: z.string().nullable(),
    concept: z.string().trim().min(1, 'El concepto es obligatorio.'),
    amount: z.number().positive('El monto debe ser mayor a cero.'),
    date: z.string().min(1, 'La fecha es obligatoria.'),
  })
  .superRefine((data, ctx) => {
    if (!data.patientId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patientId'], message: 'Debes seleccionar un paciente.' })
    }
  })

/** Returns the first validation error message, or null if the input is valid. */
export function validatePaymentInput(input: PaymentInput): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : result.error.issues[0]?.message ?? 'Datos inválidos.'
}
