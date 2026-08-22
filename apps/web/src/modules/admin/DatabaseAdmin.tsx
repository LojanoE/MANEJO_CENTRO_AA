import { useMemo, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import {
  useAdminDatabase,
  ADMIN_COLLECTIONS,
  matchesSearch,
  type AdminCollection,
  type AdminDoc,
} from '../../hooks/useAdminDatabase'
import JsonEditor from '../../components/ui/JsonEditor'
import { triggerBackupCall } from '../../firebase/driveApi'
import { testStorageConnection } from '../../firebase/storage'
import { logActivity } from '../../firebase/firestore'

const LABELS: Record<AdminCollection, string> = {
  users: 'Usuarios',
  patients: 'Pacientes',
  professionals: 'Profesionales',
  payments: 'Pagos',
  expenses: 'Gastos',
  visits: 'Visitas',
  medicalAuths: 'Autorizaciones médicas',
  medicalRecords: 'Fichas médicas',
  tasks: 'Tareas',
  settings: 'Configuración',
  activityLog: 'Log de actividad',
}

function formatPreview(data: Record<string, unknown>): string {
  const keys = Object.keys(data).slice(0, 5)
  const parts = keys.map((k) => `${k}: ${JSON.stringify(data[k]).slice(0, 40)}`)
  return parts.join(' · ') || '(vacío)'
}

export default function DatabaseAdmin() {
  const user = useAuthStore((s) => s.user)
  const [collection, setCollection] = useState<AdminCollection>('patients')
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<AdminDoc | null>(null)
  const [backupState, setBackupState] = useState<{ loading: boolean; ok?: boolean; message: string } | null>(null)
  const [storageTest, setStorageTest] = useState<{ loading: boolean; ok?: boolean; message: string } | null>(null)

  const { docs, loading, error, count, next, prev, hasMore, hasPrev, page, refresh, update, remove } =
    useAdminDatabase(collection)

  const filtered = useMemo(() => {
    if (!search) return docs
    return docs.filter((d) => matchesSearch(d, search))
  }, [docs, search])

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
        <p className="text-slate-500">No tienes permisos para acceder a esta sección.</p>
      </div>
    )
  }

  function openEditor(doc: AdminDoc) {
    setSelected(doc)
    setEditorOpen(true)
  }

  async function handleSave(id: string, data: Record<string, unknown>) {
    await update(id, data)
    await logActivity({
      type: 'db_admin_edit',
      message: `Documento editado desde administración`,
      submessage: `${LABELS[collection]} · ${id.slice(-6)}`,
      refId: id,
      color: 'bg-blue-500',
      icon: '🔧',
    })
    refresh()
  }

  async function handleDelete(id: string) {
    await remove(id)
    await logActivity({
      type: 'db_admin_delete',
      message: `Documento eliminado desde administración`,
      submessage: `${LABELS[collection]} · ${id.slice(-6)}`,
      refId: id,
      color: 'bg-red-500',
      icon: '🗑️',
    })
    refresh()
  }

  async function handleBackup() {
    setBackupState({ loading: true, message: 'Generando backup…' })
    try {
      const result = await triggerBackupCall()
      setBackupState({ loading: false, ok: true, message: `✓ Backup guardado: ${result.date}` })
    } catch (err) {
      setBackupState({ loading: false, ok: false, message: `✗ ${err instanceof Error ? err.message : 'Error'}` })
    }
  }

  async function handleTestStorage() {
    setStorageTest({ loading: true, message: 'Probando Storage…' })
    try {
      await testStorageConnection()
      setStorageTest({ loading: false, ok: true, message: '✓ Storage accesible.' })
    } catch (err) {
      setStorageTest({ loading: false, ok: false, message: `✗ ${err instanceof Error ? err.message : 'Error'}` })
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Base de Datos</h2>
          <p className="text-slate-500">Administración directa de documentos de Firestore</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleBackup} className="btn-secondary">💾 Backup Drive</button>
          <button onClick={handleTestStorage} className="btn-secondary">🗄️ Test Storage</button>
        </div>
      </div>

      {backupState && !backupState.loading && (
        <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${backupState.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {backupState.message}
        </div>
      )}
      {storageTest && !storageTest.loading && (
        <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${storageTest.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {storageTest.message}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Colección</p>
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value as AdminCollection)}
            className="form-input mt-1"
          >
            {ADMIN_COLLECTIONS.map((c) => (
              <option key={c} value={c}>{LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Buscar en esta página</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, nombre, email, teléfono..."
            className="form-input mt-1 w-full"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {count !== null ? `${count.toLocaleString()} documentos en total` : 'Cargando conteo…'}
          {search && ` · ${filtered.length} coinciden en esta página de ${docs.length}`}
        </p>
        <div className="flex gap-2 items-center">
          <button onClick={prev} disabled={loading || !hasPrev} className="btn-secondary text-sm">← Anterior</button>
          <span className="text-xs text-slate-400">Página {page}</span>
          <button onClick={next} disabled={loading || !hasMore} className="btn-secondary text-sm">Siguiente →</button>
          <button onClick={refresh} disabled={loading} className="btn-secondary text-sm">↻ Recargar</button>
        </div>
      </div>
      {search && (
        <p className="mb-4 -mt-2 text-xs text-amber-600">
          ⚠️ La búsqueda solo filtra los {docs.length} documentos ya cargados en esta página, no la colección completa.
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Vista previa</th>
                <th className="px-4 lg:px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((d) => (
                <tr key={d.id} className="table-row hover:bg-slate-50">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{d.id}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-600 truncate max-w-md" title={formatPreview(d.data)}>
                    {formatPreview(d.data)}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-right">
                    <button
                      onClick={() => openEditor(d)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                      title="Editar"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-400">
                    No se encontraron documentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JsonEditor
        open={editorOpen}
        id={selected?.id ?? null}
        data={selected?.data ?? null}
        onClose={() => {
          setEditorOpen(false)
          setSelected(null)
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}
