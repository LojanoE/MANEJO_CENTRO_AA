import { useState } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { useAuthStore } from '../../stores/authStore'
import Modal from '../../components/ui/Modal'
import { ROLE_LABELS } from '../../config/nav'
import type { Role } from '../../types/user'
import type { UserProfile } from '../../types/user'

interface NewUserForm {
  name: string
  email: string
  password: string
  role: Role
}

const ROLES: Role[] = ['admin', 'medico', 'administrativo']
const EMPTY: NewUserForm = { name: '', email: '', password: '', role: 'administrativo' }

export default function Users() {
  const { users, loading, error, create, setRole, toggleStatus } = useUsers()
  const currentUser = useAuthStore((s) => s.user)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewUserForm>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await create(form)
      setForm(EMPTY)
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChangeRole(u: UserProfile, role: Role) {
    try {
      await setRole(u.uid, role)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar rol')
    }
  }

  async function handleToggle(u: UserProfile) {
    if (u.uid === currentUser?.uid) {
      alert('No puedes desactivar tu propia cuenta')
      return
    }
    await toggleStatus(u)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuarios y Roles</h2>
          <p className="text-slate-500">Gestión de accesos y permisos del sistema</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary self-start sm:self-auto">+ Nuevo Usuario</button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Nombre</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Correo</th>
                <th className="px-4 lg:px-6 py-3.5">Rol</th>
                <th className="px-4 lg:px-6 py-3.5">Estado</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Último Acceso</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.uid} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{u.uid.slice(-6)}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">
                    {u.name}
                    {u.uid === currentUser?.uid && <span className="ml-2 text-xs text-emerald-600">(tú)</span>}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                      disabled={u.uid === currentUser?.uid}
                      className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 focus:outline-none disabled:opacity-60"
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
                    {u.lastLogin ? String(u.lastLogin).slice(0, 16).replace('T', ' ') : 'Nunca'}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={u.uid === currentUser?.uid}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition disabled:opacity-40"
                      title={u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                    >
                      {u.status === 'Activo' ? '🚫' : '✅'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay usuarios registrados.
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

      <Modal open={open} title="Nuevo Usuario" onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="form-label">Nombre completo *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Contraseña (mín. 6) *</label>
              <input
                type="password"
                minLength={6}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Rol de acceso *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
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
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}