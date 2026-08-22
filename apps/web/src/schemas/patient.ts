import { z } from 'zod'
import type { PatientInput } from '../types/patient'

const ID_CARD_RE = /^[0-9]{5,20}$/
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    admission: z.string().min(1, 'La fecha de ingreso es obligatoria.'),
    phone: z.string().optional(),
    idCard: z.string().optional(),
    birthDate: z.string().optional(),
    email: z.string().optional(),
    monthlyFee: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.phone && !PHONE_RE.test(data.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Teléfono no válido.' })
    }
    if (data.idCard && !ID_CARD_RE.test(data.idCard)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idCard'],
        message: 'La cédula debe tener solo números (5 a 20 dígitos).',
      })
    }
    if (data.email && !EMAIL_RE.test(data.email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Correo electrónico no válido.' })
    }
    if (data.monthlyFee != null && data.monthlyFee < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['monthlyFee'], message: 'La cuota mensual no puede ser negativa.' })
    }
    if (data.birthDate && data.admission && data.admission < data.birthDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['admission'],
        message: 'La fecha de ingreso no puede ser anterior a la fecha de nacimiento.',
      })
    }
  })

/** Returns the first validation error message, or null if the input is valid. */
export function validatePatientInput(input: PatientInput): string | null {
  const result = schema.safeParse(input)
  return result.success ? null : result.error.issues[0]?.message ?? 'Datos inválidos.'
}
