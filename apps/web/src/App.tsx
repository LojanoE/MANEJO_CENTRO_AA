import { useEffect } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { subscribeAuthState } from './firebase/auth'

import Login from './modules/auth/Login'
import Offline from './modules/auth/Offline'
import Dashboard from './modules/dashboard/Dashboard'
import Patients from './modules/patients/Patients'
import PatientDetail from './modules/patients/PatientDetail'
import PatientAdmission from './modules/patients/PatientAdmission'
import Finances from './modules/finances/Finances'
import Visits from './modules/visits/Visits'
import MedicalAuths from './modules/medical/MedicalAuths'
import MedicalHome from './modules/medical/MedicalHome'
import MedicalFormList from './modules/medical/MedicalFormList'
import MedicalFormats from './modules/medical/MedicalFormats'
import PsychologyHome from './modules/psychology/PsychologyHome'
import PsychPatient from './modules/psychology/PsychPatient'
import PsychEvaluationForm from './modules/psychology/PsychEvaluationForm'
import PrintPsychHistory from './modules/print/PrintPsychHistory'
import PrintPsychEvolution from './modules/print/PrintPsychEvolution'
import SocialHome from './modules/social/SocialHome'
import SocialPatient from './modules/social/SocialPatient'
import SocialFichaForm from './modules/social/SocialFichaForm'
import SocialSeguimientoForm from './modules/social/SocialSeguimientoForm'
import PrintSocialFicha from './modules/print/PrintSocialFicha'
import PrintSocialSeguimiento from './modules/print/PrintSocialSeguimiento'
import OccupationalHome from './modules/occupational/OccupationalHome'
import OccupationalPatient from './modules/occupational/OccupationalPatient'
import OccupationalForm from './modules/occupational/OccupationalForm'
import PrintOccupational from './modules/print/PrintOccupational'
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
import PrintMsp005Sheet from './modules/print/PrintMsp005Sheet'
import PrintMsp001 from './modules/print/PrintMsp001'
import PrintBlankForm from './modules/print/PrintBlankForm'
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
                <Route path="/patients/:patientId/admision" element={<PatientAdmission />} />
                <Route path="/finances" element={<RoleGuard module="finances"><Finances /></RoleGuard>} />
                <Route path="/visits" element={<Visits />} />
                <Route path="/medical" element={<MedicalHome />} />
                <Route path="/medical/autorizaciones" element={<MedicalAuths />} />
                <Route path="/medical/formularios/:formType" element={<MedicalFormList />} />
                <Route path="/medical/formatos" element={<MedicalFormats />} />
                <Route path="/psychology" element={<RoleGuard module="psychology"><PsychologyHome /></RoleGuard>} />
                <Route path="/psychology/:patientId" element={<RoleGuard module="psychology"><PsychPatient /></RoleGuard>} />
                <Route
                  path="/psychology/:patientId/evaluacion"
                  element={<RoleGuard module="psychology" action="create"><PsychEvaluationForm /></RoleGuard>}
                />
                <Route
                  path="/psychology/:patientId/evaluacion/:entryId"
                  element={<RoleGuard module="psychology" action="edit"><PsychEvaluationForm /></RoleGuard>}
                />
                <Route path="/social" element={<RoleGuard module="social"><SocialHome /></RoleGuard>} />
                <Route path="/social/:patientId" element={<RoleGuard module="social"><SocialPatient /></RoleGuard>} />
                <Route
                  path="/social/:patientId/ficha"
                  element={<RoleGuard module="social" action="create"><SocialFichaForm /></RoleGuard>}
                />
                <Route
                  path="/social/:patientId/ficha/:entryId"
                  element={<RoleGuard module="social" action="edit"><SocialFichaForm /></RoleGuard>}
                />
                <Route
                  path="/social/:patientId/seguimiento"
                  element={<RoleGuard module="social" action="create"><SocialSeguimientoForm /></RoleGuard>}
                />
                <Route
                  path="/social/:patientId/seguimiento/:entryId"
                  element={<RoleGuard module="social" action="edit"><SocialSeguimientoForm /></RoleGuard>}
                />
                <Route path="/occupational" element={<RoleGuard module="occupational"><OccupationalHome /></RoleGuard>} />
                <Route path="/occupational/:patientId" element={<RoleGuard module="occupational"><OccupationalPatient /></RoleGuard>} />
                <Route
                  path="/occupational/:patientId/evaluacion"
                  element={<RoleGuard module="occupational" action="create"><OccupationalForm /></RoleGuard>}
                />
                <Route
                  path="/occupational/:patientId/evaluacion/:entryId"
                  element={<RoleGuard module="occupational" action="edit"><OccupationalForm /></RoleGuard>}
                />
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
              <Route path="/print/msp005/:recordId" element={<RoleGuard module="records"><PrintMsp005Sheet /></RoleGuard>} />
              <Route path="/print/msp001/:patientId" element={<RoleGuard module="patients"><PrintMsp001 /></RoleGuard>} />
              <Route path="/print/psico/historia/:patientId" element={<RoleGuard module="psychology"><PrintPsychHistory /></RoleGuard>} />
              <Route path="/print/psico/evolucion/:patientId" element={<RoleGuard module="psychology"><PrintPsychEvolution /></RoleGuard>} />
              <Route path="/print/social/ficha/:patientId" element={<RoleGuard module="social"><PrintSocialFicha /></RoleGuard>} />
              <Route path="/print/social/seguimiento/:patientId" element={<RoleGuard module="social"><PrintSocialSeguimiento /></RoleGuard>} />
              <Route path="/print/occupational/:patientId" element={<RoleGuard module="occupational"><PrintOccupational /></RoleGuard>} />
              <Route
                path="/print/occupational/:patientId/:entryId"
                element={<RoleGuard module="occupational"><PrintOccupational /></RoleGuard>}
              />
              {/* Formatos del expediente pre-llenados (con paciente) o en blanco */}
              <Route path="/print/formato/:formId" element={<RoleGuard module="records"><PrintBlankForm /></RoleGuard>} />
              <Route
                path="/print/formato/:formId/:patientId"
                element={<RoleGuard module="records"><PrintBlankForm /></RoleGuard>}
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