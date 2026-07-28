import { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'
import {
  testDriveConnectionCall,
  listBackupsCall,
  triggerBackupCall,
} from '../../firebase/driveApi'
import { DRIVE_ROOT_FOLDER_ID } from '../../config/drive'

const DEFAULT_CATEGORIES = ['Limpieza', 'Mantenimiento', 'Terapia', 'Administración', 'Compras', 'Reunión', 'Otro']

interface BackupFile {
  id: string
  name: string
  modifiedTime?: string
  webViewLink?: string
}

export default function Settings() {
  const { get, save } = useSettings()
  const [centerName, setCenterName] = useState('')
  const [monthlyFee, setMonthlyFee] = useState(150)
  const [driveFolderId, setDriveFolderId] = useState('')
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ rootId: string; rootName?: string; saEmail?: string } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [backupsError, setBackupsError] = useState<string | null>(null)
  const [runningBackup, setRunningBackup] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await get()
        if (mounted && data) {
          setCenterName((data.centerName as string) ?? '')
          setMonthlyFee((data.monthlyFee as number) ?? 150)
          setDriveFolderId((data.driveFolderId as string) ?? DRIVE_ROOT_FOLDER_ID ?? '')
          setCategories((data.taskCategories as string[]) ?? DEFAULT_CATEGORIES)
        }
      } catch (err) {
        console.error('[settings] load error', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [get])

  async function refreshBackups() {
    setBackupsLoading(true)
    setBackupsError(null)
    try {
      const res = await listBackupsCall()
      const files = (res.files ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
      }))
      // Each backup folder contains one firestore-export.json; Drive lists folders by name
      setBackups(files.sort((a, b) => (a.name < b.name ? 1 : -1)))
    } catch (err) {
      setBackupsError(err instanceof Error ? err.message : 'Error al cargar backups')
    } finally {
      setBackupsLoading(false)
    }
  }

  useEffect(() => {
    refreshBackups().catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await save({
        centerName,
        monthlyFee: Number(monthlyFee),
        driveFolderId: driveFolderId || null,
        taskCategories: categories,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestDrive() {
    setTesting(true)
    setTestError(null)
    setTestResult(null)
    try {
      const res = await testDriveConnectionCall()
      setTestResult({ rootId: res.rootId, rootName: res.rootName, saEmail: res.saEmail })
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Error al probar conexión')
    } finally {
      setTesting(false)
    }
  }

  async function handleBackupNow() {
    if (!confirm('¿Generar un backup manual ahora?')) return
    setRunningBackup(true)
    try {
      await triggerBackupCall()
      await refreshBackups()
      alert('✅ Backup generado correctamente')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar backup')
    } finally {
      setRunningBackup(false)
    }
  }

  function addCategory() {
    const c = newCategory.trim()
    if (!c) return
    if (!categories.includes(c)) setCategories([...categories, c])
    setNewCategory('')
  }
  function removeCategory(c: string) {
    setCategories(categories.filter((x) => x !== c))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Configuración del Centro</h2>
        <p className="text-slate-500">Parámetros generales editables desde la interfaz</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        {saved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
            ✓ Configuración guardada correctamente.
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Información General</h3>
          <div className="space-y-5">
            <div>
              <label className="form-label">Nombre del Centro</label>
              <input
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                placeholder="Centro de Rehabilitación Alcohólicos Anónimos"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Cuota Mensual ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Categorías de Tareas</h3>
          <p className="text-sm text-slate-500 mb-3">Categorías disponibles al crear tareas del centro. Puedes agregar o quitar.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {c}
                <button type="button" onClick={() => removeCategory(c)} className="text-slate-400 hover:text-red-600" title="Quitar">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCategory()
                }
              }}
              placeholder="Nueva categoría…"
              className="form-input flex-1"
            />
            <button type="button" onClick={addCategory} className="btn-secondary">+ Agregar</button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Integración Google Drive</h3>
          <div>
            <label className="form-label">ID de carpeta raíz en Drive</label>
            <input
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              placeholder="1aBcDeFgHi..."
              className="form-input"
            />
            <p className="mt-2 text-xs text-slate-400">
              El ID se obtiene de la URL de la carpeta: drive.google.com/drive/folders/<strong>este_es_el_id</strong>.
              Esta carpeta debe estar compartida con el email del Service Account (verificado abajo).
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={handleTestDrive} disabled={testing} className="btn-secondary">
              {testing ? 'Probando…' : '🔌 Probar conexión'}
            </button>
          </div>

          {testResult && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-bold text-emerald-800">✅ Conexión exitosa</p>
              <div className="mt-2 space-y-1 text-xs text-emerald-700">
                <p>📂 Carpeta raíz: <strong>{testResult.rootName ?? '—'}</strong></p>
                <p className="font-mono break-all">ID: {testResult.rootId}</p>
                <p>👨‍💻 SA: <code className="break-all">{testResult.saEmail ?? '—'}</code></p>
              </div>
              <p className="mt-2 text-xs text-emerald-600">
                Comparte la carpeta con este email (rol Lector) en Drive para permitir el acceso.
              </p>
            </div>
          )}
          {testError && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-bold text-red-800">❌ Error de conexión</p>
              <p className="mt-1 text-xs text-red-700">{testError}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Backups automáticos</h3>
            <div className="flex gap-2">
              <button type="button" onClick={refreshBackups} className="btn-secondary text-xs">↻ Refrescar</button>
              <button type="button" onClick={handleBackupNow} disabled={runningBackup} className="btn-primary text-xs">
                {runningBackup ? 'Generando…' : '⤴ Backup manual'}
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            En modo piloto el backup es manual. Exporta toda la base de datos a Drive como JSON cuando lo necesites.
          </p>
          {backupsError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 mb-3">{backupsError}</div>
          )}
          {backupsLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Cargando backups…</p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No hay backups todavía.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {backups.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">🗂️ {b.name}</p>
                    {b.modifiedTime && (
                      <p className="text-xs text-slate-400">
                        {new Date(b.modifiedTime).toLocaleString('es-EC')}
                      </p>
                    )}
                  </div>
                  {b.webViewLink && (
                    <a
                      href={b.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                    >
                      Ver en Drive →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}