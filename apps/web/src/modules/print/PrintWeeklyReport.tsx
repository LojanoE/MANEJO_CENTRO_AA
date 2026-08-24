import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRecords } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useProfessionals } from '../../hooks/useProfessionals'
import PrintLayout from '../../components/print/PrintLayout'
import { fetchEntriesByRecord } from '../../utils/patientDossier'
import { buildWeeklyAttentions, type Attention } from '../../utils/weeklyReport'

/**
 * Printable weekly attentions report for a single doctor, meant to be handed
 * in physically (e.g. to the Ministerio de Salud) — hence the signature line
 * at the bottom. Does its own one-shot fetch of clinical entries: this view is
 * opened in a new tab (see WeeklyReport.tsx) and has no state to share.
 */
export default function PrintWeeklyReport() {
  const { doctorUid, from, to } = useParams<{ doctorUid: string; from: string; to: string }>()
  const { records, loading: recordsLoading } = useRecords()
  const { patients } = usePatients()
  const { professionals } = useProfessionals()

  const [attentions, setAttentions] = useState<Attention[] | null>(null)

  useEffect(() => {
    if (recordsLoading || !doctorUid || !from || !to) return
    let cancelled = false
    fetchEntriesByRecord(records.map((r) => r.id)).then((entriesByRecord) => {
      if (cancelled) return
      setAttentions(buildWeeklyAttentions({ records, entriesByRecord, patients, doctorUid, from, to }))
    })
    return () => {
      cancelled = true
    }
    // records/patients are live subscriptions; re-running on every emission
    // would refetch entries constantly. Fetch once the doctor/week is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsLoading, doctorUid, from, to])

  const doctorName = professionals.find((p) => p.uid === doctorUid)?.name ?? 'Médico'
  const title = `Resumen semanal de atenciones — ${doctorName}`

  if (attentions === null) {
    return (
      <PrintLayout title={title}>
        <p className="text-sm text-slate-500">Cargando atenciones…</p>
      </PrintLayout>
    )
  }

  const uniquePatients = new Set(attentions.map((a) => a.patientId)).size

  return (
    <PrintLayout title={title}>
      <div className="space-y-6 text-sm">
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Médico</p>
            <p className="text-sm text-slate-800">{doctorName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Semana</p>
            <p className="text-sm text-slate-800">{from} al {to}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total de atenciones</p>
            <p className="text-sm text-slate-800">{attentions.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pacientes distintos</p>
            <p className="text-sm text-slate-800">{uniquePatients}</p>
          </div>
        </div>

        {attentions.length === 0 ? (
          <p className="text-sm text-slate-500">No se registraron atenciones en esta semana.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                <th className="py-2 pr-2">Fecha</th>
                <th className="py-2 pr-2">Paciente</th>
                <th className="py-2 pr-2">Tipo</th>
                <th className="py-2 pr-2">Diagnóstico</th>
                <th className="py-2">Tratamiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attentions.map((a) => (
                <tr key={a.entryId} className="break-inside-avoid align-top">
                  <td className="py-2 pr-2 whitespace-nowrap">{a.date}</td>
                  <td className="py-2 pr-2">
                    {a.patientName}
                    {a.patientIdCard && <span className="block text-slate-400">{a.patientIdCard}</span>}
                  </td>
                  <td className="py-2 pr-2">{a.type}</td>
                  <td className="py-2 pr-2 whitespace-pre-wrap">{a.diagnostico || '—'}</td>
                  <td className="py-2 whitespace-pre-wrap">{a.tratamiento || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className="break-inside-avoid pt-10 text-xs text-slate-500">
          <div className="grid grid-cols-2 gap-8">
            <div className="border-t border-slate-400 pt-2 text-center">Firma del médico</div>
            <div className="border-t border-slate-400 pt-2 text-center">Sello del centro</div>
          </div>
        </footer>
      </div>
    </PrintLayout>
  )
}
