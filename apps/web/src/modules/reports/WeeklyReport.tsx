import { useEffect, useMemo, useState } from 'react'
import { useRecords } from '../../hooks/useRecords'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/ui/ToastProvider'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import { fetchEntriesByRecord } from '../../utils/patientDossier'
import { getWeekRange, shiftWeek, buildWeeklyAttentions, weeklyFilename, type Attention } from '../../utils/weeklyReport'
import { exportWeeklyToExcel } from '../../utils/patientExcel'
import type { RecordEntry } from '../../types/medicalRecord'

export default function WeeklyReport() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const { records, patients, loading: recordsLoading } = useRecords()
  const { professionals } = useProfessionals()
  const toast = useToast()

  // Only doctors linked to a login account (see AGENTS.md: users<->professionals)
  // are selectable — one without a uid can't be attributed any entries, and an
  // empty uid would collide with the "not yet selected" sentinel below.
  const doctors = useMemo(
    () => professionals.filter((p) => p.role === 'medico' && p.active && p.uid),
    [professionals],
  )
  const myProfessional = professionals.find((p) => p.uid === user?.uid)

  const [selectedDoctorUid, setSelectedDoctorUid] = useState('')
  const [week, setWeek] = useState(() => getWeekRange())
  const [entriesByRecord, setEntriesByRecord] = useState<Map<string, RecordEntry[]> | null>(null)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [exporting, setExporting] = useState(false)

  // A médico is locked to their own linked professional; an admin defaults to
  // the first active doctor but can switch. See AGENTS.md: users<->professionals.
  useEffect(() => {
    if (isAdmin) {
      if (!selectedDoctorUid && doctors.length > 0) setSelectedDoctorUid(doctors[0].uid ?? '')
    } else if (myProfessional?.uid) {
      setSelectedDoctorUid(myProfessional.uid)
    }
  }, [isAdmin, doctors, myProfessional, selectedDoctorUid])

  // One-shot fetch of every record's clinical entries once records are ready.
  // Filtering by week/doctor below is local — switching weeks or doctors never
  // triggers another read.
  useEffect(() => {
    if (recordsLoading) return
    setLoadingEntries(true)
    fetchEntriesByRecord(records.map((r) => r.id))
      .then(setEntriesByRecord)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las atenciones.'))
      .finally(() => setLoadingEntries(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsLoading, records.length])

  const attentions: Attention[] = useMemo(() => {
    if (!entriesByRecord || !selectedDoctorUid) return []
    return buildWeeklyAttentions({
      records,
      entriesByRecord,
      patients,
      doctorUid: selectedDoctorUid,
      from: week.from,
      to: week.to,
    })
  }, [entriesByRecord, records, patients, selectedDoctorUid, week])

  const selectedDoctorName =
    (isAdmin ? doctors.find((d) => d.uid === selectedDoctorUid)?.name : myProfessional?.name) ?? user?.name ?? 'Médico'
  const uniquePatients = new Set(attentions.map((a) => a.patientId)).size
  const loading = recordsLoading || loadingEntries
  const printHref =
    selectedDoctorUid ? `#/print/weekly/${selectedDoctorUid}/${week.from}/${week.to}` : undefined

  function handleExportExcel() {
    if (!selectedDoctorUid) return
    setExporting(true)
    try {
      exportWeeklyToExcel(
        attentions,
        { doctorName: selectedDoctorName, from: week.from, to: week.to },
        `${weeklyFilename(selectedDoctorName, week.from)}.xlsx`,
      )
      toast.success('Resumen semanal exportado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo exportar el resumen.')
    } finally {
      setExporting(false)
    }
  }

  if (!isAdmin && !myProfessional) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Resumen Semanal</h2>
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
          Tu usuario aún no está vinculado a un profesional. Pide a un administrador que lo vincule en
          "Profesionales".
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Resumen Semanal</h2>
        <p className="text-slate-500">Atenciones realizadas por semana, para presentar (p. ej. al Ministerio de Salud)</p>
      </div>

      <div className="mb-6 rounded-2xl bg-white shadow-sm border border-slate-100 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div className="flex flex-wrap items-end gap-4">
            {isAdmin && (
              <div>
                <label className="form-label">Médico</label>
                <select
                  value={selectedDoctorUid}
                  onChange={(e) => setSelectedDoctorUid(e.target.value)}
                  className="form-input w-full sm:w-64"
                >
                  {doctors.length === 0 && <option value="">Sin médicos registrados</option>}
                  {doctors.map((d) => (
                    <option key={d.id} value={d.uid ?? ''}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="form-label">Semana</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeek((w) => shiftWeek(w, -1))}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                  aria-label="Semana anterior"
                  title="Semana anterior"
                >
                  ‹
                </button>
                <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                  {week.from} al {week.to}
                </span>
                <button
                  onClick={() => setWeek((w) => shiftWeek(w, 1))}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                  aria-label="Semana siguiente"
                  title="Semana siguiente"
                >
                  ›
                </button>
                <button
                  onClick={() => setWeek(getWeekRange())}
                  className="text-xs font-semibold text-emerald-700 hover:underline ml-1"
                >
                  Hoy
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={printHref}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!printHref}
              className={`btn-secondary text-center ${!printHref ? 'pointer-events-none opacity-60' : ''}`}
            >
              📄 Imprimir / PDF
            </a>
            <button onClick={handleExportExcel} disabled={!selectedDoctorUid || exporting} className="btn-primary disabled:opacity-60">
              {exporting ? 'Exportando…' : '📊 Exportar Excel'}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Atenciones</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{attentions.length}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pacientes Distintos</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-700">{uniquePatients}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5">Paciente</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Tipo</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Diagnóstico</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Tratamiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && <SkeletonTableRows columns={5} rows={5} />}
              {!loading && attentions.map((a) => (
                <tr key={a.entryId} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600">{a.date}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{a.patientName}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{a.type}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden lg:table-cell truncate max-w-xs">{a.diagnostico || '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden xl:table-cell truncate max-w-xs">{a.tratamiento || '—'}</td>
                </tr>
              ))}
              {!loading && attentions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    No se registraron atenciones en esta semana.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
