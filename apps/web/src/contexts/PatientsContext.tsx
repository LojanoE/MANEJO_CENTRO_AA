import { createContext, useContext, type ReactNode } from 'react'
import { useCollection } from '../hooks/useCollection'
import type { Patient } from '../types/patient'

interface PatientsContextValue {
  patients: Patient[]
  loading: boolean
  error: string | null
}

const PatientsContext = createContext<PatientsContextValue | null>(null)

/**
 * Single shared subscription to the `patients` collection.
 *
 * Without this, every hook that needs patient data (usePayments, useVisits,
 * useRecords, useMedicalAuths, useTasks, ...) opened its own `onSnapshot`
 * listener on the whole collection — a single screen like PatientDetail ended
 * up with 4+ concurrent listeners on the same data. Mount once near the app
 * root; `usePatients()` reads from this context instead of subscribing itself.
 */
export function PatientsProvider({ children }: { children: ReactNode }) {
  const { data: patients, loading, error } = useCollection<Patient>('patients')
  return (
    <PatientsContext.Provider value={{ patients, loading, error }}>{children}</PatientsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs next to its context/provider
export function usePatientsContext(): PatientsContextValue {
  const ctx = useContext(PatientsContext)
  if (!ctx) throw new Error('usePatientsContext debe usarse dentro de <PatientsProvider>')
  return ctx
}
