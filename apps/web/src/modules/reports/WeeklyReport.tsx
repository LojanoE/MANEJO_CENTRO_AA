import { useEffect, useMemo, useState } from 'react'
import { useRecords } from '../../hooks/useRecords'
import { useProfessionals } from '../../hooks/useProfessionals'
import { usePermissions } from '../../hooks/usePermissions'
import { useWorkLog } from '../../hooks/useWorkLog'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import PatientSelect from '../../components/ui/PatientSelect'
import { ROLE_LABELS } from '../../config/nav'
import { todayISO } from '../../utils/date'
import { fetchEntriesByRecord } from '../../utils/patientDossier'
import { fetchPsychologyEntries, fetchSocialWorkEntries, fetchOccupationalEntries } from '../../firebase/firestore'
import {
  getWeekRange,
  shiftWeek,
  buildWeeklyMedicalAttentions,
  buildWeeklyPsychologyAttentions,
  buildWeeklySocialAttentions,
  buildWeeklyOccupationalAttentions,
  weeklyFilename,
  type Attention,
} from '../../utils/weeklyReport'
import { exportWeeklyToExcel } from '../../utils/patientExcel'
import type { RecordEntry } from '../../types/medicalRecord'
import type { PsychEntry } from '../../types/psychology'
import type { SocialWorkEntry } from '../../types/socialWork'
import type { OccupationalEntry } from '../../types/occupational'
import type { WorkLogEntry, WorkLogInput } from '../../types/workLog'
import type { Role } from '../../types/user'

/** Roles que atienden pacientes directamente y por eso tienen su propio
 * resumen semanal. Admin y administrativo no aparecen en el selector: no
 * generan atenciones propias, aunque puedan abrir la pantalla. */
const CLINICAL_ROLES: Role[] = ['medico', 'psicologo', 'trabajo_social', 'terapia_ocupacional']

type WorkLogDraft = { date: string; activity: string; patientId: string | null; description: string }

const newWorkLogDraft = (): WorkLogDraft => ({ date: todayISO(), activity: '', patientId: null, description: '' })

/**
 * Bitácora de la semana del profesional elegido: reuniones, capacitaciones,
 * visitas domiciliarias y demás trabajo que no es una atención a un paciente.
 * Solo se puede agregar/editar la propia — ver nota en el plan sobre esta
 * excepción al patrón "permiso por módulo, sin dueño" del resto de la app.
 */
function WorkLogSection({
  entries,
  patients,
  canCreate,
  canManageAny,
  userUid,
  create,
  update,
  remove,
}: {
  entries: WorkLogEntry[]
  patients: { id: string; name: string }[]
  canCreate: boolean
  canManageAny: boolean
  userUid: string | undefined
  create: (input: WorkLogInput) => Promise<string>
  update: (entry: WorkLogEntry, patch: Partial<WorkLogInput>) => Promise<void>
  remove: (entry: WorkLogEntry) => Promise<void>
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState<WorkLogDraft | null>(null)
  const [editing, setEditing] = useState<WorkLogEntry | null>(null)
  const [saving, setSaving] = useState(false)

  function canManage(entry: WorkLogEntry) {
    return canManageAny || entry.authorId === userUid
  }

  function startEdit(entry: WorkLogEntry) {
    setEditing(entry)
    setDraft({ date: entry.date, activity: entry.activity, patientId: entry.patientId ?? null, description: entry.description })
  }

  function closeDraft() {
    setDraft(null)
    setEditing(null)
  }

  async function handleSave() {
    if (!draft) return
    if (!draft.activity.trim()) {
      toast.error('Indique el tipo de actividad.')
      return
    }
    setSaving(true)
    const payload: WorkLogInput = {
      date: draft.date,
      activity: draft.activity.trim(),
      patientId: draft.patientId,
      description: draft.description.trim(),
    }
    try {
      if (editing) await update(editing, payload)
      else await create(payload)
      toast.success(editing ? 'Actividad actualizada.' : 'Actividad registrada.')
      closeDraft()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la actividad.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry: WorkLogEntry) {
    const ok = await confirm({ title: 'Eliminar actividad', message: `¿Eliminar "${entry.activity}" del ${entry.date}? No se puede deshacer.` })
    if (!ok) return
    try {
      await remove(entry)
      toast.success('Actividad eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la actividad.')
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-white shadow-sm border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Otras actividades</h3>
          <p className="text-sm text-slate-500">Reuniones, capacitaciones, visitas domiciliarias, gestiones… — la bitácora de la semana.</p>
        </div>
        {canCreate && !draft && (
          <button
            onClick={() => {
              setEditing(null)
              setDraft(newWorkLogDraft())
            }}
            className="btn-primary text-xs"
          >
            + Nueva actividad
          </button>
        )}
      </div>

      {draft && (
        <div className="border-b border-emerald-200 bg-emerald-50/40 p-4 lg:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Actividad</label>
              <input
                value={draft.activity}
                onChange={(e) => setDraft({ ...draft, activity: e.target.value })}
                placeholder="Reunión de equipo, capacitación, visita domiciliaria…"
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Paciente relacionado (opcional)</label>
            <PatientSelect patients={patients} value={draft.patientId} onChange={(patientId) => setDraft({ ...draft, patientId })} />
          </div>
          <div>
            <label className="form-label">Descripción</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Qué se hizo, con quién, resultado…"
              className="form-textarea"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar actividad'}
            </button>
            <button onClick={closeDraft} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-50">
        {entries.length === 0 && !draft && (
          <p className="px-4 lg:px-6 py-8 text-center text-sm text-slate-400">Sin actividades registradas esta semana.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {entry.activity} <span className="font-normal text-slate-400">· {entry.date}</span>
              </p>
              {entry.patientName && <p className="text-xs text-slate-500">Paciente: {entry.patientName}</p>}
              {entry.description && <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{entry.description}</p>}
            </div>
            {canManage(entry) && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(entry)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar">
                  ✏️
                </button>
                <button onClick={() => handleDelete(entry)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Eliminar">
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WeeklyReport() {
  const user = useAuthStore((s) => s.user)
  // Alcance de datos, no permiso de módulo: el admin elige cualquier
  // profesional del equipo clínico, el resto queda fijado a su propio perfil.
  const canPickAnyProfessional = user?.role === 'admin'
  const { records, patients, loading: recordsLoading } = useRecords()
  const { professionals } = useProfessionals()
  const { can } = usePermissions()
  const { entries: workLogEntries, create: createWorkLog, update: updateWorkLog, remove: removeWorkLog } = useWorkLog()
  const toast = useToast()

  // Solo los profesionales vinculados a un usuario de acceso (ver AGENTS.md:
  // users<->professionals) son seleccionables — uno sin uid no puede tener
  // atenciones atribuidas, y un uid vacío chocaría con el centinela de abajo.
  const eligibleProfessionals = useMemo(
    () =>
      professionals
        .filter((p) => CLINICAL_ROLES.includes(p.role) && p.active && p.uid)
        .sort((a, b) => CLINICAL_ROLES.indexOf(a.role) - CLINICAL_ROLES.indexOf(b.role) || a.name.localeCompare(b.name, 'es')),
    [professionals],
  )
  const myProfessional = professionals.find((p) => p.uid === user?.uid)

  const [selectedUid, setSelectedUid] = useState('')
  const [week, setWeek] = useState(() => getWeekRange())
  const [entriesByRecord, setEntriesByRecord] = useState<Map<string, RecordEntry[]> | null>(null)
  const [psychEntries, setPsychEntries] = useState<PsychEntry[] | null>(null)
  const [socialEntries, setSocialEntries] = useState<SocialWorkEntry[] | null>(null)
  const [occupationalEntries, setOccupationalEntries] = useState<OccupationalEntry[] | null>(null)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [exporting, setExporting] = useState(false)

  // El personal clínico queda fijado a su propio perfil vinculado; un admin
  // parte del primero disponible pero puede cambiarlo. Ver AGENTS.md: users<->professionals.
  useEffect(() => {
    if (canPickAnyProfessional) {
      if (!selectedUid && eligibleProfessionals.length > 0) setSelectedUid(eligibleProfessionals[0].uid ?? '')
    } else if (myProfessional?.uid) {
      setSelectedUid(myProfessional.uid)
    }
  }, [canPickAnyProfessional, eligibleProfessionals, myProfessional, selectedUid])

  const selectedProfessional = professionals.find((p) => p.uid === selectedUid)

  // Carga puntual de las cuatro áreas una sola vez que las fichas médicas están
  // listas. Filtrar por semana/profesional después es local: cambiar de
  // semana o de profesional nunca dispara otra lectura.
  useEffect(() => {
    if (recordsLoading) return
    setLoadingEntries(true)
    Promise.all([
      fetchEntriesByRecord(records.map((r) => r.id)),
      fetchPsychologyEntries(),
      fetchSocialWorkEntries(),
      fetchOccupationalEntries(),
    ])
      .then(([byRecord, psych, social, occupational]) => {
        setEntriesByRecord(byRecord)
        setPsychEntries(psych)
        setSocialEntries(social)
        setOccupationalEntries(occupational)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las atenciones.'))
      .finally(() => setLoadingEntries(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsLoading, records.length])

  const attentions: Attention[] = useMemo(() => {
    if (!selectedUid || !selectedProfessional) return []
    const { from, to } = week
    switch (selectedProfessional.role) {
      case 'medico':
        return entriesByRecord
          ? buildWeeklyMedicalAttentions({ records, entriesByRecord, patients, authorUid: selectedUid, from, to })
          : []
      case 'psicologo':
        return psychEntries ? buildWeeklyPsychologyAttentions({ entries: psychEntries, patients, authorUid: selectedUid, from, to }) : []
      case 'trabajo_social':
        return socialEntries ? buildWeeklySocialAttentions({ entries: socialEntries, patients, authorUid: selectedUid, from, to }) : []
      case 'terapia_ocupacional':
        return occupationalEntries
          ? buildWeeklyOccupationalAttentions({ entries: occupationalEntries, patients, authorUid: selectedUid, from, to })
          : []
      default:
        return []
    }
  }, [selectedProfessional, entriesByRecord, psychEntries, socialEntries, occupationalEntries, records, patients, selectedUid, week])

  /** Bitácora del profesional elegido dentro de la semana mostrada. */
  const weekActivities = useMemo(
    () =>
      workLogEntries
        .filter((e) => e.authorId === selectedUid && e.date >= week.from && e.date <= week.to)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [workLogEntries, selectedUid, week],
  )

  const selectedName = selectedProfessional?.name ?? user?.name ?? 'Profesional'
  // El médico mantiene sus columnas de siempre; las demás áreas no manejan
  // "diagnóstico"/"tratamiento" en sentido clínico estricto.
  const isMedical = !selectedProfessional || selectedProfessional.role === 'medico'
  const detailLabel = isMedical ? 'Diagnóstico' : 'Detalle'
  const treatmentLabel = isMedical ? 'Tratamiento' : 'Notas'
  const uniquePatients = new Set(attentions.map((a) => a.patientId)).size
  const showWorkLog = can('worklog', 'view')
  // Una actividad siempre se atribuye a quien la registra: no tiene sentido
  // crearla mientras un admin revisa la semana de otra persona.
  const canAddActivity = can('worklog', 'create') && Boolean(selectedUid) && selectedUid === user?.uid
  const loading = recordsLoading || loadingEntries
  const printHref = selectedUid ? `#/print/weekly/${selectedUid}/${week.from}/${week.to}` : undefined

  function handleExportExcel() {
    if (!selectedUid) return
    setExporting(true)
    try {
      exportWeeklyToExcel(
        attentions,
        weekActivities,
        { professionalName: selectedName, from: week.from, to: week.to },
        `${weeklyFilename(selectedName, week.from)}.xlsx`,
      )
      toast.success('Resumen semanal exportado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo exportar el resumen.')
    } finally {
      setExporting(false)
    }
  }

  if (!canPickAnyProfessional && !myProfessional) {
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
            {canPickAnyProfessional && (
              <div>
                <label className="form-label">Profesional</label>
                <select
                  value={selectedUid}
                  onChange={(e) => setSelectedUid(e.target.value)}
                  className="form-input w-full sm:w-72"
                >
                  {eligibleProfessionals.length === 0 && <option value="">Sin profesionales registrados</option>}
                  {eligibleProfessionals.map((p) => (
                    <option key={p.id} value={p.uid ?? ''}>
                      {p.name} — {ROLE_LABELS[p.role]}
                    </option>
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
            <button onClick={handleExportExcel} disabled={!selectedUid || exporting} className="btn-primary disabled:opacity-60">
              {exporting ? 'Exportando…' : '📊 Exportar Excel'}
            </button>
          </div>
        </div>
      </div>

      <div className={`mb-6 grid grid-cols-1 gap-4 ${showWorkLog ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Atenciones</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{attentions.length}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pacientes Distintos</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-700">{uniquePatients}</p>
        </div>
        {showWorkLog && (
          <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Otras Actividades</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-600">{weekActivities.length}</p>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5">Paciente</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Tipo</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">{detailLabel}</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">{treatmentLabel}</th>
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

      {showWorkLog && (
        <WorkLogSection
          entries={weekActivities}
          patients={patients}
          canCreate={canAddActivity}
          canManageAny={user?.role === 'admin'}
          userUid={user?.uid}
          create={createWorkLog}
          update={updateWorkLog}
          remove={removeWorkLog}
        />
      )}
    </div>
  )
}
