import { PERMISSIONS, type ModuleId } from './permissions'
import type { Role } from '../types/user'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  administrativo: 'Administrativo',
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'role-admin',
  medico: 'role-medico',
  administrativo: 'role-administrativo',
}

export type NavItem = {
  id: string
  /** Módulo de `config/permissions.ts` que decide si el ítem se muestra. */
  moduleId: ModuleId
  label: string
  icon: string
  path?: string
  /** Variantes de nombre por rol: es presentación, no autorización. */
  labelByRole?: Partial<Record<Role, string>>
}

/**
 * Catálogo único y ordenado del menú. Qué ve cada rol NO se declara aquí: se
 * deriva de `PERMISSIONS` en `navItemsForRole`, para que no existan dos listas
 * que puedan quedar desincronizadas.
 */
const ALL_ITEMS: NavItem[] = [
  { id: 'dashboard', moduleId: 'dashboard', label: 'Dashboard', icon: '📊' },
  {
    id: 'patients',
    moduleId: 'patients',
    label: 'Pacientes',
    icon: '👤',
    labelByRole: { medico: 'Mis Pacientes' },
  },
  { id: 'records', moduleId: 'records', label: 'Fichas Médicas', icon: '📝' },
  { id: 'finances', moduleId: 'finances', label: 'Finanzas', icon: '💰' },
  {
    id: 'visits',
    moduleId: 'visits',
    label: 'Control de Visitas',
    icon: '📅',
    labelByRole: { medico: 'Solicitudes de Visita', administrativo: 'Registro de Visitas' },
  },
  {
    id: 'medical',
    moduleId: 'medical',
    label: 'Área Médica',
    icon: '🩺',
    labelByRole: { medico: 'Área Médica' },
  },
  { id: 'tasks', moduleId: 'tasks', label: 'Tareas del Centro', icon: '✅' },
  { id: 'users', moduleId: 'users', label: 'Usuarios y Roles', icon: '🔐' },
  { id: 'professionals', moduleId: 'professionals', label: 'Profesionales', icon: '🧑‍⚕️' },
  { id: 'reports', moduleId: 'reports', label: 'Reportes', icon: '📈' },
  { id: 'weekly-report', moduleId: 'reports', label: 'Resumen Semanal', icon: '🗓️', path: '/reports/weekly' },
  { id: 'admin-database', moduleId: 'admin-database', label: 'Base de Datos', icon: '🗄️', path: '/admin/database' },
  { id: 'settings', moduleId: 'settings', label: 'Configuración', icon: '⚙️' },
]

/** Ítems visibles para un rol, en orden, con su etiqueta ya resuelta. */
export function navItemsForRole(role: Role): NavItem[] {
  return ALL_ITEMS.filter((item) => PERMISSIONS[role]?.[item.moduleId]?.view === true).map((item) =>
    item.labelByRole?.[role] ? { ...item, label: item.labelByRole[role] as string } : item,
  )
}
