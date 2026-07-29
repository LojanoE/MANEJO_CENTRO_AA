import { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings'

const DEFAULT_CATEGORIES = ['Limpieza', 'Mantenimiento', 'Terapia', 'Administración', 'Compras', 'Reunión', 'Otro']

export default function Settings() {
  const { get, save } = useSettings()
  const [centerName, setCenterName] = useState('')
  const [monthlyFee, setMonthlyFee] = useState(150)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await get()
        if (mounted && data) {
          setCenterName((data.centerName as string) ?? '')
          setMonthlyFee((data.monthlyFee as number) ?? 150)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await save({
        centerName,
        monthlyFee: Number(monthlyFee),
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

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}
