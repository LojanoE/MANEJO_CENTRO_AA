export type PaymentStatus = 'Pagado' | 'Pendiente'
export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Depósito' | 'Tarjeta' | '—'

export interface Payment {
  id: string
  patientId: string | null
  patientName: string
  concept: string
  amount: number
  date: string // ISO
  status: PaymentStatus
  method: PaymentMethod
  nextPaymentDate: string | null
  createdBy?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewPayment = Omit<Payment, 'id'>
export type PaymentInput = Omit<NewPayment, 'patientName' | 'createdAt' | 'updatedAt'>