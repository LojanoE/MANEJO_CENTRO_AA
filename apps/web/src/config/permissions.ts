import type { Role } from '../types/user'

/**
 * Matriz central de permisos: rol → módulo → acción.
 *
 * Fuente única de verdad para "¿quién puede hacer qué?". Los componentes no
 * comprueban `user.role === 'admin'`: preguntan `can('finances', 'create')` a
 * través de `hooks/usePermissions.ts`. El menú lateral también se deriva de
 * aquí (`config/nav.ts`), para que no haya dos listas que mantener a mano.
 *
 * ⚠️ Esto es control de UX en el cliente, no una frontera de seguridad: las
 * reglas de Firestore siguen siendo `auth != null` durante el piloto (ver
 * AGENTS.md §6), así que cualquier usuario autenticado puede escribir por
 * fuera de la interfaz.
 */

/** Ids alineados con los del menú lateral (`config/nav.ts`). */
export type ModuleId =
  | 'dashboard'
  | 'patients'
  | 'records'
  | 'finances'
  | 'visits'
  | 'medical'
  | 'tasks'
  | 'users'
  | 'professionals'
  | 'reports'
  | 'admin-database'
  | 'settings'

/**
 * Además del CRUD básico, las acciones específicas cubren afordancias que no
 * son "editar" a secas y que conviene poder conceder por separado.
 */
export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  /** Users: cambiar el rol de otro usuario. */
  | 'changeRole'
  /** Finanzas: marcar un pago pendiente como pagado. */
  | 'markPaid'
  /** Visitas y Autorizaciones: aprobar, denegar o cambiar estado. */
  | 'authorize'
  /** Tareas: editar la plantilla del checklist semanal. */
  | 'manageTemplate'
  /** Pacientes: entrar a la ficha detallada. */
  | 'viewDetail'
  /** Pacientes: importación masiva desde Excel (operación en bloque). */
  | 'import'
  /** Base de Datos: disparar respaldos y edición cruda de documentos. */
  | 'backup'

type ModulePermissions = Partial<Record<Action, boolean>>

/** Sin acceso: el módulo ni siquiera aparece en el menú. */
const NONE: ModulePermissions = {}

export const PERMISSIONS: Record<Role, Record<ModuleId, ModulePermissions>> = {
  admin: {
    dashboard: { view: true },
    patients: { view: true, create: true, edit: true, delete: true, viewDetail: true, import: true },
    records: { view: true, create: true, edit: true, delete: true },
    finances: { view: true, create: true, edit: true, delete: true, markPaid: true },
    visits: { view: true, create: true, edit: true, delete: true, authorize: true },
    medical: { view: true, create: true, edit: true, delete: true, authorize: true },
    tasks: { view: true, create: true, edit: true, delete: true, manageTemplate: true },
    users: { view: true, create: true, edit: true, delete: true, changeRole: true },
    professionals: { view: true, create: true, edit: true, delete: true },
    reports: { view: true },
    'admin-database': { view: true, edit: true, delete: true, backup: true },
    settings: { view: true, edit: true },
  },
  medico: {
    dashboard: { view: true },
    // `viewDetail: false` conserva el comportamiento previo (la ficha unificada
    // era de admin/administrativo). El médico además solo ve sus pacientes
    // asignados: ese filtro por fila vive en Patients.tsx, no aquí.
    patients: { view: true, create: true, edit: true, viewDetail: false },
    records: { view: true, create: true, edit: true },
    finances: NONE,
    visits: { view: true, create: true, edit: true, delete: true, authorize: true },
    medical: { view: true, create: true, edit: true, delete: true, authorize: true },
    tasks: { view: true, create: true, edit: true },
    users: NONE,
    professionals: { view: true, create: true, edit: true },
    reports: { view: true },
    'admin-database': NONE,
    settings: NONE,
  },
  administrativo: {
    dashboard: { view: true },
    patients: { view: true, create: true, edit: true, viewDetail: true },
    // Área clínica: solo lectura. Escribir historia clínica es del médico.
    records: { view: true },
    // Gestión completa de ingresos y egresos, incluida la eliminación.
    finances: { view: true, create: true, edit: true, delete: true, markPaid: true },
    // Registra, edita y resuelve solicitudes de visita.
    visits: { view: true, create: true, edit: true, authorize: true },
    // Área clínica: solo lectura, tampoco cambia estados de autorización.
    medical: { view: true },
    tasks: { view: true, create: true, edit: true, manageTemplate: true },
    users: NONE,
    professionals: { view: true, create: true, edit: true, delete: true },
    reports: { view: true },
    'admin-database': NONE,
    settings: NONE,
  },
}
