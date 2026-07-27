interface StatusBadgeProps {
  status: string
  variant?: 'auto' | 'activo' | 'pendiente' | 'aprobado' | 'denegado' | 'nuevo' | 'alta' | 'revision' | 'role-admin' | 'role-medico' | 'role-administrativo' | 'custom'
  className?: string
}

const CUSTOM_MAP: Record<string, string> = {
  'Fase 1': 'bg-red-100 text-red-700',
  'Fase 2': 'bg-amber-100 text-amber-700',
  'Fase 3': 'bg-blue-100 text-blue-700',
  'Fase 4': 'bg-emerald-100 text-emerald-700',
}

export default function StatusBadge({ status, variant = 'auto', className = '' }: StatusBadgeProps) {
  if (variant === 'custom') {
    return (
      <span className={`status-badge ${CUSTOM_MAP[status] ?? 'bg-slate-100 text-slate-600'} ${className}`}>
        {status}
      </span>
    )
  }
  let cls = ''
  if (variant === 'auto') {
    const map: Record<string, string> = {
      Activo: 'status-activo',
      Pendiente: 'status-pendiente',
      Aprobado: 'status-aprobado',
      Denegado: 'status-denegado',
      Nuevo: 'status-nuevo',
      Alta: 'status-alta',
      'En revisión': 'status-revision',
      'Requiere autorización': 'status-revision',
      Administrador: 'role-admin',
      Médico: 'role-medico',
      Administrativo: 'role-administrativo',
    }
    cls = map[status] ?? 'bg-slate-100 text-slate-600'
  } else {
    cls = variant
  }
  return <span className={`status-badge ${cls} ${className}`}>{status}</span>
}