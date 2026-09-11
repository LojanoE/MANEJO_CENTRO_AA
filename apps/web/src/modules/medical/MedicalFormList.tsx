import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchMspEntries } from '../../firebase/firestore'
import { useRecords } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { MSP_FORM_LABELS, type MspFormType, type RecordEntry } from '../../types/medicalRecord'
import { compareEntriesAsc, diagnosticosText, entryDateTime } from '../../utils/mspEntry'

/**
 * Listado de UN formulario MSP (002 o 005) en todos los pacientes.
 * Lectura puntual por collection group, con filtro y orden en cliente (ver
 * `fetchMspEntries`: así no hace falta ningún índice en Firestore).
 */
export default function MedicalFormList() {
  const { formType } = useParams<{ formType: string }>()
  const form: MspFormType = formType === '005' || formType === '006' ? formType : '002'
  const navigate = useNavigate()
  const { records } = useRecords()
  const { patients } = usePatients()
  const { can } = usePermissions()
  const toast = useToast()

  const [entries, setEntries] = useState<RecordEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const list = await fetchMspEntries(form)
        if (cancelled) return
        list.sort((a, b) => compareEntriesAsc(b, a))
        setEntries(list)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar registros.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form])

  const patientNameOf = useMemo(() => {
    const byRecord = new Map(records.map((r) => [r.id, r]))
    const byPatient = new Map(patients.map((p) => [p.id, p.name]))
    return (entry: RecordEntry) => {
      const rec = byRecord.get(entry.recordId)
      return (rec && (byPatient.get(rec.patientId) ?? rec.patientName)) || '—'
    }
  }, [records, patients])

  function startNew() {
    if (!patientId) return
    const rec = records.find((r) => r.patientId === patientId)
    if (rec) {
      navigate(`/records/${rec.id}/entry?form=${form}`)
      return
    }
    // Sin historia abierta: toda historia se abre con la Consulta Externa (002).
    if (form !== '002') {
      toast.info('El paciente aún no tiene historia clínica: primero se abre con la Consulta Externa (MSP 002).')
    }
    navigate(`/records/new/${patientId}`)
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/medical')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver al Área Médica
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{MSP_FORM_LABELS[form]}</h2>
          <p className="text-slate-500">{entries.length} registros en este formulario</p>
        </div>
        {can('records', 'create') && (
          <div className="flex gap-2 self-start sm:self-auto">
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="form-input max-w-56">
              <option value="">Elegir paciente…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button onClick={startNew} disabled={!patientId} className="btn-primary whitespace-nowrap">
              + Nuevo registro
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5">Paciente</th>
                <th className="px-4 lg:px-6 py-3.5">Título</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Diagnóstico</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Médico</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    Cargando registros…
                  </td>
                </tr>
              )}
              {!loading &&
                entries.map((e) => (
                  <tr key={e.id} className="table-row">
                    <td className="px-4 lg:px-6 py-3.5 text-slate-600 whitespace-nowrap">{entryDateTime(e)}</td>
                    <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">
                      {patientNameOf(e)}
                      {e.pendienteCompletar && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Migrado
                        </span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-3.5 text-slate-600">{e.title}</td>
                    <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell max-w-64 truncate">
                      {diagnosticosText(e).split('\n')[0] || '—'}
                    </td>
                    <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden md:table-cell">
                      {e.authorName ?? '—'}
                    </td>
                    <td className="px-4 lg:px-6 py-3.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => navigate(`/records/${e.recordId}`)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          Ver historia
                        </button>
                        <a
                          href={`#/print/msp/${e.recordId}/${e.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:border-emerald-300 hover:text-emerald-700 transition"
                          title="Imprimir formulario MSP"
                        >
                          🖨️
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    Aún no hay registros en este formulario.
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
