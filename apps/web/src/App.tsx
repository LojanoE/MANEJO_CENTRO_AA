import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { subscribeAuthState } from './firebase/auth'

import Login from './modules/auth/Login'
import Offline from './modules/auth/Offline'
import Dashboard from './modules/dashboard/Dashboard'
import Patients from './modules/patients/Patients'
import PatientDetail from './modules/patients/PatientDetail'
import Finances from './modules/finances/Finances'
import Visits from './modules/visits/Visits'
import MedicalAuths from './modules/medical/MedicalAuths'
import Records from './modules/records/Records'
import RecordDetail from './modules/records/RecordDetail'
import RecordNew from './modules/records/RecordNew'
import RecordEntryForm from './modules/records/RecordEntryForm'
import Tasks from './modules/tasks/Tasks'
import Users from './modules/users/Users'
import Professionals from './modules/professionals/Professionals'
import Settings from './modules/settings/Settings'
import Reports from './modules/reports/Reports'
import DatabaseAdmin from './modules/admin/DatabaseAdmin'
import AppShell from './components/layout/AppShell'
import AuthGuard from './components/auth/AuthGuard'
import Placeholder from './components/ui/Placeholder'

function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    const unsub = subscribeAuthState((user, profile) => {
      if (user && profile) {
        setUser(profile)
      } else {
        setUser(null)
      }
    })
    return () => {
      unsub()
      setLoading(false)
    }
  }, [setUser, setLoading])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/offline" element={<Offline />} />
      <Route
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:patientId" element={<PatientDetail />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/visits" element={<Visits />} />
        <Route path="/medical" element={<MedicalAuths />} />
        <Route path="/records" element={<Records />} />
        <Route path="/records/new/:patientId" element={<RecordNew />} />
        <Route path="/records/:recordId" element={<RecordDetail />} />
        <Route path="/records/:recordId/entry" element={<RecordEntryForm />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/users" element={<Users />} />
        <Route path="/professionals" element={<Professionals />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin/database" element={<DatabaseAdmin />} />
        <Route path="*" element={<Placeholder title="Página no encontrada" icon="🔍" />} />
      </Route>
    </Routes>
  )
}

export default App