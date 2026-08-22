import { useMemo, useState } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { useAuthStore } from '../../stores/authStore'
import Modal from '../../components/ui/Modal'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import { useTableSort } from '../../hooks/useTableSort'
import SortIndicator from '../../components/ui/SortIndicator'
import { ROLE_LABELS } from '../../config/nav'
import type { Role } from '../../types/user'
import type { UserProfile } from '../../types/user'

const ROLE_FILTERS = ['Todos', 'admin', 'medico', 'administrativo'] as const
type RoleFilter = (typeof ROLE_FILTERS)[number]

interface NewUserForm {
  username: string
  name: string
  email: string
  password: string
  role: Role
}

interface EditUserForm {
  name: string
  email: string
  role: Role
  status: 'Activo' | 'Inactivo'
  password: string
}

const ROLES: Role[] = ['admin', 'medico', 'administrativo']
const STATUSES: ('Activo' | 'Inactivo')[] = ['Activo', 'Inactivo']
const EMPTY_NEW: NewUserForm = { username: '', name: '', email: '', password: '', role: 'administrativo' }
const EMPTY_EDIT: EditUserForm = { name: '', email: '', role: 'administrativo', status: 'Activo', password: '' }

/** lastLogin is written via serverTimestamp(), so at runtime it's a Firestore Timestamp, not a string. */
function formatLastLogin(value: UserProfile['lastLogin']): string {
  if (!value) return 'Nunca'
  const date = (value as unknown as { toDate?: () => Date })?.toDate?.() ?? new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nunca'
  return date.toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Users() {
  const { users, loading, error, create, update, resetPassword, remove, setRole, toggleStatus } = useUsers()
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'
  const toast = useToast()
  const confirm = useConfirm()

  const [openNew, setOpenNew] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [newForm, setNewForm] = useState<NewUserForm>(EMPTY_NEW)
  const [editForm, setEditForm] = useState<EditUserForm>(EMPTY_EDIT)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const adminCount = users.filter((u) => u.role === 'admin').length

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Todos')

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase()
      const matchesSearch = !search || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'Todos' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  const { sorted, sortKey, sortDir, toggleSort } = useTableSort<UserProfile>(filtered)

  function sortableHeader(key: keyof UserProfile, label: string, className = '') {
    return (
      <th className={`px-4 lg:px-6 py-3.5 cursor-pointer select-none hover:text-slate-600 ${className}`} onClick={() => toggleSort(key)}>
        {label}
        <SortIndicator active={sortKey === key} direction={sortDir} />
      </th>
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await create({
        username: newForm.username,
        name: newForm.name,
        email: newForm.email || null,
        password: newForm.password,
        role: newForm.role,
      })
      setNewForm(EMPTY_NEW)
      setOpenNew(false)
      toast.success('Usuario creado.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  function openEditModal(u: UserProfile) {
    setEditing(u)
    setEditForm({
      name: u.name,
      email: u.email ?? '',
      role: u.role,
      status: u.status ?? 'Activo',
      password: '',
    })
    setFormError(null)
    setOpenEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSubmitting(true)
    setFormError(null)
    try {
      const patch: Partial<EditUserForm> = { ...editForm }
      if (!patch.password) delete patch.password
      await update(editing.uid, patch)
      if (editForm.password && editForm.password.length >= 6) {
        await resetPassword(editing.uid, editForm.password)
      }
      setEditing(null)
      setEditForm(EMPTY_EDIT)
      setOpenEdit(false)
      toast.success('Usuario actualizado.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar usuario')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(u: UserProfile) {
    if (u.uid === currentUser?.uid) {
      toast.error('No puedes eliminar tu propia cuenta.')
      return
    }
    if (u.role === 'admin' && adminCount <= 1) {
      toast.error('No puedes eliminar el último administrador.')
      return
    }
    const ok = await confirm({
      title: 'Eliminar usuario',
      message: `¿Eliminar permanentemente a ${u.name} (@${u.username})?`,
    })
    if (!ok) return
    try {
      await remove(u)
      toast.success('Usuario eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar usuario.')
    }
  }

  async function handleChangeRole(u: UserProfile, role: Role) {
    try {
      await setRole(u.uid, role)
      toast.success('Rol actualizado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar rol.')
    }
  }

  async function handleToggle(u: UserProfile) {
    if (u.uid === currentUser?.uid) {
      toast.error('No puedes desactivar tu propia cuenta.')
      return
    }
    try {
      await toggleStatus(u)
      toast.success(u.status === 'Activo' ? 'Usuario desactivado.' : 'Usuario activado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuarios y Roles</h2>
          <p className="text-slate-500">Gestión de accesos y permisos del sistema</p>
        </div>
        {isAdmin && (
          <button onClick={() => setOpenNew(true)} className="btn-primary self-start sm:self-auto">+ Nuevo Usuario</button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
        Cada usuario necesita un nombre de usuario único. Puedes crear varios usuarios para la misma persona
        usando distintos usuarios y el mismo email de contacto.
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre o usuario..."
          className="form-input w-full sm:w-64"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className="form-input w-full sm:w-auto">
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>{r === 'Todos' ? 'Todos' : ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                {sortableHeader('username', 'Usuario')}
                {sortableHeader('name', 'Nombre')}
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Email contacto</th>
                {sortableHeader('role', 'Rol')}
                {sortableHeader('status', 'Estado')}
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Último Acceso</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && <SkeletonTableRows columns={7} rows={5} />}
              {sorted.map((u) => (
                <tr key={u.uid} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-600">@{u.username}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">
                    {u.name}
                    {u.uid === currentUser?.uid && <span className="ml-2 text-xs text-emerald-600">(tú)</span>}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden md:table-cell">{u.email || '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                      disabled={!isAdmin || u.uid === currentUser?.uid}
                      className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-h-[36px] focus:outline-none disabled:opacity-60"
                      title="Cambiar rol"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <span className={`status-badge ${u.status === 'Activo' ? 'status-activo' : 'bg-slate-100 text-slate-500'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                    {formatLastLogin(u.lastLogin)}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        disabled={!isAdmin || u.uid === currentUser?.uid}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition disabled:opacity-40"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={!isAdmin || u.uid === currentUser?.uid}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition disabled:opacity-40"
                        title={u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                      >
                        {u.status === 'Activo' ? '🚫' : '✅'}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={!isAdmin || u.uid === currentUser?.uid}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition disabled:opacity-40"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    {users.length === 0 ? 'No hay usuarios registrados.' : 'Ningún usuario coincide con los filtros actuales.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles info cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">🔐</div>
            <h3 className="font-bold text-slate-800">Administrador</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Acceso total al sistema</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Gestión de usuarios y roles</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Reportes financieros completos</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Configuración del centro</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">🩺</div>
            <h3 className="font-bold text-slate-800">Médico</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Historial clínico de pacientes</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Autorización de visitas</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Evaluaciones médicas</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Fichas y entradas clínicas</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">📋</div>
            <h3 className="font-bold text-slate-800">Administrativo</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Registro de pacientes</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Control de pagos y cuotas</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Registro de visitas</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Tareas del centro</li>
          </ul>
        </div>
      </div>

      <Modal open={openNew} title="Nuevo Usuario" onClose={() => setOpenNew(false)}>
        <form onSubmit={handleCreate} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="form-label">Nombre de usuario *</label>
            <input
              required
              value={newForm.username}
              onChange={(e) => setNewForm({ ...newForm, username: e.target.value })}
              placeholder="Ej: dr.garcia.medico"
              className="form-input"
            />
            <p className="mt-1 text-xs text-slate-500">Solo letras minúsculas, números, puntos, guiones y guiones bajos.</p>
          </div>
          <div>
            <label className="form-label">Nombre completo *</label>
            <input
              required
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Email de contacto</label>
              <input
                type="email"
                value={newForm.email}
                onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Contraseña (mín. 6) *</label>
              <input
                type="password"
                minLength={6}
                required
                value={newForm.password}
                onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Rol de acceso *</label>
            <select
              value={newForm.role}
              onChange={(e) => setNewForm({ ...newForm, role: e.target.value as Role })}
              className="form-input"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creando…' : 'Crear Usuario'}
            </button>
            <button type="button" onClick={() => setOpenNew(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={openEdit} title={editing ? `Editar: ${editing.name}` : 'Editar Usuario'} onClose={() => setOpenEdit(false)}>
        <form onSubmit={handleEdit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="form-label">Nombre de usuario</label>
            <input
              value={editing?.username ?? ''}
              disabled
              className="form-input bg-slate-50 text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">El nombre de usuario no se puede cambiar.</p>
          </div>
          <div>
            <label className="form-label">Nombre completo</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Email de contacto</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Rol</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                className="form-input"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'Activo' | 'Inactivo' })}
                className="form-input"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
            <input
              type="password"
              minLength={6}
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="form-input"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : 'Guardar Cambios'}
            </button>
            <button type="button" onClick={() => setOpenEdit(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
