import { useCallback } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { db } from '../firebase/config'
import { uploadDriveFile } from '../firebase/drive'
import { usePatients } from './usePatients'
import type { Payment, PaymentInput, NewPayment, PaymentStatus, PaymentMethod } from '../types/payment'

export function addDaysISO(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function updatePatientNextPayment(patientId: string, nextPaymentDate: string) {
  await updateDoc(doc(db, 'patients', patientId), { nextPaymentDate })
}

export function usePayments() {
  const { data: payments, loading, error } = useCollection<Payment>('payments')
  const { patients } = usePatients()

  const resolvePatientName = useCallback(
    (patientId: string | null | undefined) => {
      if (!patientId) return '—'
      return patients.find((p) => p.id === patientId)?.name ?? 'Paciente eliminado'
    },
    [patients],
  )

  const create = useCallback(
    async (input: PaymentInput, receipt?: File) => {
      const patientName = resolvePatientName(input.patientId)
      const data: NewPayment = { ...input, patientName }
      const id = await saveDoc('payments', data)

      if (input.status === 'Pagado' && input.patientId && input.nextPaymentDate) {
        await updatePatientNextPayment(input.patientId, input.nextPaymentDate)
      }

      if (receipt && input.patientId) {
        try {
          const res = await uploadDriveFile(
            `pacientes/${input.patientId}/comprobantes`,
            `comprobante-${id.slice(-6)}-${Date.now()}.${receipt.name.split('.').pop() || 'jpg'}`,
            receipt,
          )
          await updateDocHelper('payments', id, { receiptDriveId: res.fileId, receiptUrl: res.webViewLink })
        } catch (err) {
          console.warn('[payments] receipt upload failed', err)
        }
      }

      await logActivity({
        type: 'new_payment',
        message: `Nuevo pago: ${input.concept}`,
        submessage: `${patientName} — $${input.amount.toFixed(2)} · ${input.status}`,
        refId: id,
        color: 'bg-emerald-500',
        icon: '💰',
      })
      return id
    },
    [resolvePatientName],
  )

  const update = useCallback(
    async (id: string, input: PaymentInput) => {
      const patientName = resolvePatientName(input.patientId)
      const patch: Partial<Payment> = {
        ...input,
        patientName,
        amount: Number(input.amount) || 0,
      }
      await updateDocHelper('payments', id, patch)

      if (input.status === 'Pagado' && input.patientId && input.nextPaymentDate) {
        await updatePatientNextPayment(input.patientId, input.nextPaymentDate)
      }

      await logActivity({
        type: 'new_payment',
        message: `Pago actualizado: ${input.concept}`,
        submessage: `${patientName} — $${patch.amount?.toFixed(2)} · ${input.status}`,
        refId: id,
        color: 'bg-blue-500',
        icon: '✏️',
      })
    },
    [resolvePatientName],
  )

  const markStatus = useCallback(
    async (p: Payment, status: PaymentStatus) => {
      await updateDocHelper('payments', p.id, { status })
      if (status === 'Pagado' && p.patientId) {
        const nextPaymentDate = addDaysISO(p.date, 30)
        await updatePatientNextPayment(p.patientId, nextPaymentDate)
      }
      await logActivity({
        type: 'new_payment',
        message: `Pago ${status.toLowerCase()}`,
        submessage: `${p.patientName} — $${p.amount.toFixed(2)}`,
        refId: p.id,
        color: status === 'Pagado' ? 'bg-emerald-500' : 'bg-amber-500',
        icon: '💰',
      })
    },
    [],
  )

  const remove = useCallback(async (p: Payment) => {
    await removeDoc('payments', p.id)
    await logActivity({
      type: 'new_payment',
      message: `Pago eliminado`,
      submessage: `${p.patientName} — $${p.amount.toFixed(2)}`,
      refId: p.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  return { payments, patients, loading, error, create, update, markStatus, remove }
}

export const PAYMENT_METHODS: PaymentMethod[] = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta', '—']
export const PAYMENT_STATUSES: PaymentStatus[] = ['Pagado', 'Pendiente']
