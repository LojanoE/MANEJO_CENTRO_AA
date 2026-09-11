import { useEffect } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
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
import MedicalHome from './modules/medical/MedicalHome'
import MedicalFormList from './modules/medical/MedicalFormList'
import Records from './modules/records/Records'
import RecordDetail from './modules/records/RecordDetail'
import RecordNew from './modules/records/RecordNew'
import RecordEntryForm from './modules/records/RecordEntryForm'
import Tasks from './modules/tasks/Tasks'
import Users from './modules/users/Users'
import Professionals from './modules/professionals/Professionals'
import Settings from './modules/settings/Settings'
import Reports from './modules/reports/Reports'
import WeeklyReport from './modules/reports/WeeklyReport'
import DatabaseAdmin from './modules/admin/DatabaseAdmin'
import PrintPatient from './modules/print/PrintPatient'
import PrintPayment from './modules/print/PrintPayment'
import PrintAuth from './modules/print/PrintAuth'
import PrintRecord from './modules/print/PrintRecord'
import PrintMspForm from './modules/print/PrintMspForm'
import PrintPatientFile from './modules/print/PrintPatientFile'
import PrintWeeklyReport from './modules/print/PrintWeeklyReport'
import AppShell from './components/layout/AppShell'
import AuthGuard from './components/auth/AuthGuard'
import RoleGuard from './components/auth/RoleGuard'
import Placeholder from './components/ui/Placeholder'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/ToastProvider'
import { ConfirmProvider } from './components/ui/ConfirmProvider'
import { PatientsProvider } from './contexts/PatientsContext'

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
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/offline" element={<Offline />} />
            <Route
              element={
                <AuthGuard>
                  <PatientsProvider>
                    <Outlet />
                  </PatientsProvider>
                </AuthGuard>
              }
            >
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/patients/:patientId" element={<PatientDetail />} />
                <Route path="/finances" element={<RoleGuard module="finances"><Finances /></RoleGuard>} />
                <Route path="/visits" element={<Visits />} />
                <Route path="/medical" element={<MedicalHome />} />
                <Route path="/medical/autorizaciones" element={<MedicalAuths />} />
                <Route path="/medical/formularios/:formType" element={<MedicalFormList />} />
                <Route path="/records" element={<Records />} />
                {/* Formularios de escritura clínica: sin variante de solo lectura,
                    así que se bloquean enteros en vez de esconder botones. */}
                <Route
                  path="/records/new/:patientId"
                  element={<RoleGuard module="records" action="create"><RecordNew /></RoleGuard>}
                />
                <Route path="/records/:recordId" element={<RecordDetail />} />
                <Route
                  path="/records/:recordId/entry"
                  element={<RoleGuard module="records" action="create"><RecordEntryForm /></RoleGuard>}
                />
                <Route
                  path="/records/:recordId/entry/:entryId"
                  element={<RoleGuard module="records" action="edit"><RecordEntryForm /></RoleGuard>}
                />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/users" element={<RoleGuard module="users"><Users /></RoleGuard>} />
                <Route path="/professionals" element={<Professionals />} />
                <Route path="/settings" element={<RoleGuard module="settings"><Settings /></RoleGuard>} />
                <Route path="/reports" element={<RoleGuard module="reports"><Reports /></RoleGuard>} />
                <Route path="/reports/weekly" element={<RoleGuard module="reports"><WeeklyReport /></RoleGuard>} />
                <Route path="/admin/database" element={<RoleGuard module="admin-database"><DatabaseAdmin /></RoleGuard>} />
                <Route path="*" element={<Placeholder title="Página no encontrada" icon="🔍" />} />
              </Route>
              {/* Vistas imprimibles: sin sidebar/header, ver components/print/PrintLayout.tsx */}
              <Route path="/print/patient/:patientId" element={<RoleGuard module="patients"><PrintPatient /></RoleGuard>} />
              <Route path="/print/payment/:paymentId" element={<RoleGuard module="finances"><PrintPayment /></RoleGuard>} />
              <Route path="/print/auth/:authId" element={<RoleGuard module="medical"><PrintAuth /></RoleGuard>} />
              <Route path="/print/record/:recordId" element={<RoleGuard module="records"><PrintRecord /></RoleGuard>} />
              <Route
                path="/print/msp/:recordId/:entryId"
                element={<RoleGuard module="records"><PrintMspForm /></RoleGuard>}
              />
              <Route path="/print/patient-file/:patientId" element={<RoleGuard module="patients"><PrintPatientFile /></RoleGuard>} />
              <Route
                path="/print/weekly/:doctorUid/:from/:to"
                element={<RoleGuard module="reports"><PrintWeeklyReport /></RoleGuard>}
              />
            </Route>
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App