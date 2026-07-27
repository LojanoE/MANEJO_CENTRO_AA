/**
 * Seed script — run once after Firestore is provisioned.
 * Usage:
 *   cd functions
 *   npm run build
 *   node lib/seed.js
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a
 * Service Account JSON, OR run inside Cloud Functions shell.
 * It inserts demo patients/payments/tasks matching the mockup.
 */
import admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

admin.initializeApp()
const db = admin.firestore()

const now = FieldValue.serverTimestamp()

const patients = [
  { name: 'Carlos Andrés Vargas', age: 42, stage: 'Fase 2', status: 'Activo', admission: '2026-01-15', phone: '099-123-4567', sponsor: 'Luis M.', email: 'c.vargas@email.com', address: 'Av. Principal 123, Quito', assignedDoctorName: 'Dr. Mendoza' },
  { name: 'María Elena Suárez', age: 35, stage: 'Fase 3', status: 'Activo', admission: '2025-11-03', phone: '098-765-4321', sponsor: 'Ana R.', email: 'm.suarez@email.com', address: 'Calle Secundaria 45, Guayaquil', assignedDoctorName: 'Dra. Castillo' },
  { name: 'Roberto Patiño', age: 51, stage: 'Fase 1', status: 'Nuevo', admission: '2026-07-10', phone: '097-111-2222', sponsor: 'Sin asignar', email: 'r.patino@email.com', address: 'Barrio Central 78, Cuenca', assignedDoctorName: 'Dr. Mendoza' },
  { name: 'Diana Fernanda López', age: 28, stage: 'Fase 2', status: 'Activo', admission: '2026-02-20', phone: '096-333-4444', sponsor: 'Pedro G.', email: 'd.lopez@email.com', address: 'Urbanización Norte 12, Ambato', assignedDoctorName: 'Dr. Mendoza' },
  { name: 'Jorge Enrique Salas', age: 45, stage: 'Fase 4', status: 'Alta', admission: '2025-08-12', phone: '095-555-6666', sponsor: 'Carmen T.', email: 'j.salas@email.com', address: 'Callejón Sur 89, Manta', assignedDoctorName: 'Dra. Castillo' },
  { name: 'Ana Lucía Morales', age: 33, stage: 'Fase 1', status: 'Activo', admission: '2026-06-28', phone: '094-777-8888', sponsor: 'Sin asignar', email: 'a.morales@email.com', address: 'Av. República 456, Quito', assignedDoctorName: 'Dr. Mendoza' },
  { name: 'Fernando José Ruiz', age: 39, stage: 'Fase 3', status: 'Activo', admission: '2026-04-15', phone: '093-999-0000', sponsor: 'María S.', email: 'f.ruiz@email.com', address: 'Colón y 10 de Agosto, Guayaquil', assignedDoctorName: 'Dra. Castillo' },
]

const payments = [
  { patientName: 'Carlos Andrés Vargas', concept: 'Cuota mensual Julio', amount: 150, date: '2026-07-05', status: 'Pagado', method: 'Transferencia' },
  { patientName: 'María Elena Suárez', concept: 'Cuota mensual Julio', amount: 150, date: '2026-07-03', status: 'Pagado', method: 'Efectivo' },
  { patientName: 'Roberto Patiño', concept: 'Inscripción + 1er mes', amount: 200, date: '2026-07-10', status: 'Pendiente', method: '—' },
  { patientName: 'Diana Fernanda López', concept: 'Cuota mensual Julio', amount: 150, date: '2026-07-08', status: 'Pagado', method: 'Depósito' },
  { patientName: 'Jorge Enrique Salas', concept: 'Cuota mensual Julio', amount: 150, date: '2026-07-01', status: 'Pagado', method: 'Transferencia' },
  { patientName: 'Fernando José Ruiz', concept: 'Cuota mensual Julio', amount: 150, date: '2026-07-06', status: 'Pagado', method: 'Efectivo' },
]

const tasks = [
  { title: 'Limpiar sala de terapia', description: 'Limpieza profunda semanal de la sala principal de grupo AA.', category: 'Limpieza', priority: 'Alta', status: 'Pendiente', dueDate: '2026-07-28', recurring: { type: 'Semanal' } },
  { title: 'Revisar botiquín de enfermería', description: 'Verificar fechas de vencimiento de medicamentos y reponer insumos básicos.', category: 'Administración', priority: 'Media', status: 'Pendiente', dueDate: '2026-07-30', recurring: { type: 'Mensual' } },
  { title: 'Sesión grupal AA — 19:00', description: 'Coordinar sillas, café y materiales para la sesión de las 19:00.', category: 'Terapia', priority: 'Alta', status: 'Pendiente', dueDate: '2026-07-27', recurring: { type: 'Diaria' } },
  { title: 'Comprar insumos de limpieza', description: 'Detergente, desinfectante, papel higiénico, jabón.', category: 'Compras', priority: 'Media', status: 'Pendiente', dueDate: '2026-07-29', recurring: { type: 'Única' } },
  { title: 'Mantenimiento calentador de agua', description: 'Revisar y limpiar el calentador de los baños compartidos.', category: 'Mantenimiento', priority: 'Baja', status: 'Pendiente', dueDate: '2026-08-02', recurring: { type: 'Única' } },
  { title: 'Reunión equipo terapéutico', description: 'Revisión mensual de avances de pacientes.', category: 'Reunión', priority: 'Alta', status: 'Pendiente', dueDate: '2026-08-01', recurring: { type: 'Mensual' } },
]

const activityLog = [
  { type: 'new_payment', message: 'Nuevo pago registrado', submessage: 'Carlos Vargas — $150.00 — hace 2 horas', color: 'bg-emerald-500', icon: '💰' },
  { type: 'visit_pending', message: 'Solicitud de visita pendiente', submessage: 'María Suárez — espera autorización médica', color: 'bg-amber-500', icon: '📅' },
  { type: 'new_patient', message: 'Paciente ingresado', submessage: 'Roberto Patiño — Fase 1', color: 'bg-blue-500', icon: '👤' },
  { type: 'auth_issued', message: 'Autorización médica emitida', submessage: 'Dr. Mendoza — Visita familiar aprobada', color: 'bg-violet-500', icon: '🩺' },
  { type: 'visit_denied', message: 'Visita denegada', submessage: 'Diana López — visitante externo no autorizado', color: 'bg-red-400', icon: '🚫' },
]

const settings = {
  centerName: 'Centro de Rehabilitación Alcohólicos Anónimos',
  monthlyFee: 150,
  taskCategories: ['Limpieza', 'Mantenimiento', 'Terapia', 'Administración', 'Compras', 'Reunión', 'Otro'],
  createdAt: now,
  updatedAt: now,
}

async function run() {
  console.log('Seeding patients…')
  for (const p of patients) {
    await db.collection('patients').add({ ...p, assignedDoctorId: null, photoDriveId: null, photoUrl: null, createdAt: now, updatedAt: now })
  }
  console.log('Seeding payments…')
  for (const py of payments) {
    await db.collection('payments').add({ ...py, patientId: null, createdBy: null, createdAt: now, updatedAt: now })
  }
  console.log('Seeding tasks…')
  for (const t of tasks) {
    await db.collection('tasks').add({ ...t, assignedToId: null, assignedToName: null, patientId: null, patientName: null, completedAt: null, completedById: null, createdAt: now, updatedAt: now })
  }
  console.log('Seeding activityLog…')
  for (const a of activityLog) {
    await db.collection('activityLog').add({ ...a, userId: null, userName: null, refId: null, timestamp: now })
  }
  console.log('Seeding settings…')
  await db.collection('settings').doc('main').set(settings)
  console.log('✅ Seed complete')
  process.exit(0)
}

run().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})