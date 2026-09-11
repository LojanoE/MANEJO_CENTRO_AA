import { useState } from 'react'
import { previewMigration, runMigration, type MigrationPreview } from '../../utils/migrateToMsp'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'

/**
 * Panel de migración del formato clásico a los formularios MSP (solo admin).
 *
 * Flujo: vista previa (dry-run, no escribe) → confirmación → ejecución.
 * La migración NO borra los campos clásicos; agrega los campos MSP y deja en
 * blanco lo que el dato antiguo no tenía, marcado como `pendienteCompletar`.
 */
export default function MspMigrationPanel() {
  const toast = useToast()
  const confirm = useConfirm()
  const [preview, setPreview] = useState<MigrationPreview | null>(null)
  const [loading, setLoading] = useState<'preview' | 'run' | null>(null)
  const [done, setDone] = useState<number | null>(null)

  async function handlePreview() {
    setLoading('preview')
    setDone(null)
    try {
      setPreview(await previewMigration())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo calcular la vista previa.')
    } finally {
      setLoading(null)
    }
  }

  async function handleRun() {
    if (!preview || preview.toMigrate === 0) return
    const ok = await confirm({
      title: 'Ejecutar migración MSP',
      message: `Se convertirán ${preview.toMigrate} entradas clásicas a los formularios MSP (002: ${preview.byForm['002']}, 005: ${preview.byForm['005']}). Los campos antiguos NO se borran y lo que no exista quedará en blanco. ¿Ya hizo el backup a Drive desde Configuración?`,
    })
    if (!ok) return
    setLoading('run')
    try {
      const n = await runMigration(preview.items)
      setDone(n)
      setPreview(await previewMigration())
      toast.success(`${n} entradas migradas a formato MSP.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La migración falló.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800">Migración a formatos MSP</h3>
          <p className="text-sm text-slate-500 mt-1">
            Convierte las entradas del formato clásico de medicina general a los formularios 002/005.
            Los datos que no existan quedan en blanco para que el médico los complete si los necesita.
          </p>
          <p className="text-xs text-amber-700 mt-1">
            ⚠️ Antes de ejecutar, haga un backup a Google Drive desde Configuración.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handlePreview} disabled={loading !== null} className="btn-secondary">
            {loading === 'preview' ? 'Calculando…' : 'Vista previa'}
          </button>
          <button
            onClick={handleRun}
            disabled={loading !== null || !preview || preview.toMigrate === 0}
            className="btn-primary"
          >
            {loading === 'run' ? 'Migrando…' : 'Ejecutar migración'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Entradas totales" value={preview.totalEntries} />
          <Stat label="Ya en formato MSP" value={preview.alreadyMsp} />
          <Stat label="Por migrar → MSP 002" value={preview.byForm['002']} accent="text-emerald-700" />
          <Stat label="Por migrar → MSP 005" value={preview.byForm['005']} accent="text-blue-700" />
        </div>
      )}

      {preview && preview.toMigrate === 0 && (
        <p className="mt-4 text-sm text-emerald-700 font-semibold">
          ✅ No hay entradas pendientes: toda la historia clínica ya está en formato MSP.
        </p>
      )}
      {done !== null && (
        <p className="mt-4 text-sm text-slate-600">
          Última ejecución: {done} entradas convertidas.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, accent = 'text-slate-800' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</p>
    </div>
  )
}
