export type Role = 'admin' | 'medico' | 'administrativo'

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

export type NavItem = { id: string; label: string; icon: string; path?: string }

export const NAV_CONFIG: Record<Role, NavItem[]> = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'patients', label: 'Pacientes', icon: '👤' },
    { id: 'finances', label: 'Finanzas', icon: '💰' },
    { id: 'visits', label: 'Control de Visitas', icon: '📅' },
    { id: 'medical', label: 'Autorizaciones Médicas', icon: '🩺' },
    { id: 'tasks', label: 'Tareas del Centro', icon: '✅' },
    { id: 'users', label: 'Usuarios y Roles', icon: '🔐' },
    { id: 'professionals', label: 'Profesionales', icon: '🧑‍⚕️' },
    { id: 'reports', label: 'Reportes', icon: '📈' },
    { id: 'admin-database', label: 'Base de Datos', icon: '🗄️', path: '/admin/database' },
    { id: 'settings', label: 'Configuración', icon: '⚙️' },
  ],
  medico: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'patients', label: 'Mis Pacientes', icon: '👤' },
    { id: 'records', label: 'Fichas Médicas', icon: '📝' },
    { id: 'visits', label: 'Solicitudes de Visita', icon: '📅' },
    { id: 'medical', label: 'Autorizaciones', icon: '🩺' },
    { id: 'tasks', label: 'Tareas del Centro', icon: '✅' },
    { id: 'reports', label: 'Reportes', icon: '📈' },
  ],
  administrativo: [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'patients', label: 'Pacientes', icon: '👤' },
    { id: 'finances', label: 'Finanzas', icon: '💰' },
    { id: 'visits', label: 'Registro de Visitas', icon: '📅' },
    { id: 'tasks', label: 'Tareas del Centro', icon: '✅' },
  ],
}