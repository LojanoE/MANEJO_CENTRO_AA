import { useCallback, useMemo } from 'react'
import { useAuthStore } from '../stores/authStore'
import { PERMISSIONS, type Action, type ModuleId } from '../config/permissions'

/**
 * Acceso a la matriz de permisos (`config/permissions.ts`) para el usuario en
 * sesión. Los componentes preguntan `can('finances', 'create')` en vez de
 * comprobar el rol a mano.
 *
 * Se selecciona `role` (un primitivo) y no el `user` completo, para no
 * re-renderizar cada vez que cambie un campo ajeno como `lastLogin`. Sin
 * sesión `can()` devuelve `false` en todo, así que los llamadores no necesitan
 * tratar ese caso.
 */
export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role)

  const can = useCallback(
    (module: ModuleId, action: Action): boolean =>
      role ? PERMISSIONS[role]?.[module]?.[action] === true : false,
    [role],
  )

  return useMemo(() => ({ role, can }), [role, can])
}
