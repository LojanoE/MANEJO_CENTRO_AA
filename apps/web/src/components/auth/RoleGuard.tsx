import { usePermissions } from '../../hooks/usePermissions'
import type { Action, ModuleId } from '../../config/permissions'

interface RoleGuardProps {
  module: ModuleId
  /** Por defecto `view`: "¿puede este rol entrar al módulo?". */
  action?: Action
  children: React.ReactNode
}

/**
 * Bloqueo de rutas por rol. Corre dentro de `AuthGuard` (que ya resolvió
 * sesión y estado de carga) y complementa al menú lateral: ocultar un ítem del
 * nav no impide llegar escribiendo la URL, esto sí.
 */
export default function RoleGuard({ module, action = 'view', children }: RoleGuardProps) {
  const { can } = usePermissions()

  if (!can(module, action)) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
        <p className="text-slate-500">No tienes permisos para acceder a esta sección.</p>
      </div>
    )
  }

  return <>{children}</>
}
