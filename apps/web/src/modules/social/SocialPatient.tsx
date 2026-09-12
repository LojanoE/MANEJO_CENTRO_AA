import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientSocialWork } from '../../hooks/useSocialWork'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import StatusBadge from '../../components/ui/StatusBadge'
import { SOCIAL_SOCIOECONOMICA } from '../../config/formTemplates/social'
import { answeredCount } from '../../utils/formAnswers'
import { formatTimestamp } from '../../utils/date'
import { hcNumber } from '../../utils/clinicalPrint'
import type { SocialWorkEntry } from '../../types/socialWork'

type Tab = 'ficha' | 'seguimientos'
const TABS: { id: Tab; label: string }[] = [
  { id: 'ficha', label: 'Ficha socioeconómica' },
  { id: 'seguimientos', label: 'Seguimientos' },
]

function FichaTab({ patientId, fichas, remove }: { patientId: string; fichas: SocialWorkEntry[] } & { remove: ReturnType<typeof usePatientSocialWork>['remove'] }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const toast = useToast()
  const confirm = useConfirm()
  const latest = fichas[0] // usePatientSocialWork ya ordena del más reciente al más antiguo

  async function handleDelete(entry: SocialWorkEntry) {
    const ok = await confirm({ title: 'Eliminar ficha', message: '¿Eliminar esta ficha socioeconómica? No se puede deshacer.' })
    if (!ok) return
    try {
      await remove(entry)
      toast.success('Ficha eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la ficha.')
    }
  }

  if (!latest) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-4xl">🏠</p>
        <p className="mt-3 font-bold text-slate-800">Aún no tiene ficha socioeconómica</p>
        <p className="mt-1 text-sm text-slate-500">
          Composición familiar, situación económica, vivienda y causas y consecuencias del consumo.
        </p>
        {can('social', 'create') && (
          <button onClick={() => navigate(`/social/${patientId}/ficha`)} className="btn-primary mt-5">
            Iniciar ficha socioeconómica
          </button>
        )}
      </div>
    )
  }

  const progress = answeredCount(SOCIAL_SOCIOECONOMICA, latest.answers)
  const pct = progress.total ? Math.round((progress.answered / progress.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Ficha socioeconómica</h3>
            <p className="text-sm text-slate-500">
              Registrada el {formatTimestamp(latest.createdAt)} · {latest.authorName ?? '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`#/print/social/ficha/${patientId}`} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center text-xs">
              🖨️ Imprimir
            </a>
            {can('social', 'edit') && (
              <button onClick={() => navigate(`/social/${patientId}/ficha/${latest.id}`)} className="btn-primary text-xs">
                ✏️ Continuar / editar
              </button>
            )}
            {can('social', 'delete') && (
              <button onClick={() => handleDelete(latest)} className="btn-secondary text-xs">
                🗑️ Eliminar
              </button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Campos con información</span>
            <span className="font-semibold text-slate-700">{progress.answered} de {progress.total}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-emerald-100">
            <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {can('social', 'create') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>¿Reingreso del usuario? Registre una nueva ficha; puede partir de la anterior.</span>
          <button onClick={() => navigate(`/social/${patientId}/ficha`)} className="btn-secondary text-xs">
            + Nueva ficha
          </button>
        </div>
      )}

      {fichas.length > 1 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <h4 className="mb-2 font-bold text-slate-800">Fichas anteriores</h4>
          <ul className="divide-y divide-slate-50 text-sm">
            {fichas.slice(1).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-slate-700">{formatTimestamp(f.createdAt)} · {f.authorName ?? '—'}</span>
                <span className="flex gap-1">
                  {can('social', 'edit') && (
                    <button onClick={() => navigate(`/social/${patientId}/ficha/${f.id}`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Abrir">
                      ✏️
                    </button>
                  )}
                  {can('social', 'delete') && (
                    <button onClick={() => handleDelete(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Eliminar">
                      🗑️
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SeguimientosTab({ patientId, seguimientos, remove }: { patientId: string; seguimientos: SocialWorkEntry[] } & { remove: ReturnType<typeof usePatientSocialWork>['remove'] }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const toast = useToast()
  const confirm = useConfirm()

  async function handleDelete(entry: SocialWorkEntry) {
    const ok = await confirm({ title: 'Eliminar seguimiento', message: '¿Eliminar esta ficha de seguimiento? No se puede deshacer.' })
    if (!ok) return
    try {
      await remove(entry)
      toast.success('Seguimiento eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el seguimiento.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{seguimientos.length} visitas de seguimiento registradas</p>
        <div className="flex gap-2">
          {seguimientos.length > 0 && (
            <a href={`#/print/social/seguimiento/${patientId}`} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center text-xs">
              🖨️ Imprimir todos
            </a>
          )}
          {can('social', 'create') && (
            <button onClick={() => navigate(`/social/${patientId}/seguimiento`)} className="btn-primary text-xs">
              + Nuevo seguimiento
            </button>
          )}
        </div>
      </div>

      {seguimientos.length === 0 && (
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-sm text-slate-400">
          Sin visitas de seguimiento registradas.
        </div>
      )}

      {seguimientos.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {formatTimestamp(s.createdAt)} · {s.authorName ?? '—'}
            </span>
            <div className="flex gap-1">
              {can('social', 'edit') && (
                <button onClick={() => navigate(`/social/${patientId}/seguimiento/${s.id}`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar">
                  ✏️
                </button>
              )}
              {can('social', 'delete') && (
                <button onClick={() => handleDelete(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Eliminar">
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Expediente de trabajo social de un paciente: ficha socioeconómica y seguimientos. */
export default function SocialPatient() {
  const { patientId } = useParams<{ patientId: string }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { patients, loading } = usePatients()
  const { can } = usePermissions()
  const patient = patients.find((p) => p.id === patientId)
  const { fichas, seguimientos, loading: entriesLoading, remove } = usePatientSocialWork(patient)

  const tabParam = params.get('tab')
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'ficha'

  if (!patient) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {loading ? 'Cargando…' : 'Paciente no encontrado.'}
      </div>
    )
  }

  const counts: Record<Tab, number> = { ficha: fichas.length, seguimientos: seguimientos.length }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/social')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Trabajo Social
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
            <p className="text-sm text-slate-500">
              N° HC {hcNumber(patient) || '—'} · {patient.age} años · Ingreso: {patient.admission}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={patient.stage} variant="custom" />
              <StatusBadge status={patient.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('patients', 'viewDetail') && (
              <button onClick={() => navigate(`/patients/${patient.id}`)} className="btn-secondary text-xs">
                👤 Ficha del paciente
              </button>
            )}
            {can('medical', 'view') && (
              <button onClick={() => navigate(`/medical/formatos?paciente=${patient.id}`)} className="btn-secondary text-xs">
                🗂️ Formatos
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 whitespace-nowrap" aria-label="Pestañas">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className={`border-b-2 px-1 py-3 text-sm font-bold transition ${
                tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {t.label}
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{counts[t.id]}</span>
            </button>
          ))}
        </nav>
      </div>

      {entriesLoading ? (
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">Cargando registros…</div>
      ) : (
        <>
          {tab === 'ficha' && <FichaTab patientId={patient.id} fichas={fichas} remove={remove} />}
          {tab === 'seguimientos' && <SeguimientosTab patientId={patient.id} seguimientos={seguimientos} remove={remove} />}
        </>
      )}
    </div>
  )
}
