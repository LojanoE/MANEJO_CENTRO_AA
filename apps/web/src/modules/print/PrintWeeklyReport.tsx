import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRecords } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useWorkLog } from '../../hooks/useWorkLog'
import PrintLayout from '../../components/print/PrintLayout'
import { fetchEntriesByRecord } from '../../utils/patientDossier'
import { fetchPsychologyEntries, fetchSocialWorkEntries, fetchOccupationalEntries } from '../../firebase/firestore'
import {
  buildWeeklyMedicalAttentions,
  buildWeeklyPsychologyAttentions,
  buildWeeklySocialAttentions,
  buildWeeklyOccupationalAttentions,
  type Attention,
} from '../../utils/weeklyReport'

/**
 * Printable weekly attentions report for a single professional, meant to be
 * handed in physically (e.g. to the Ministerio de Salud) — hence the
 * signature line at the bottom. Does its own one-shot fetch of clinical
 * entries: this view is opened in a new tab (see WeeklyReport.tsx) and has no
 * state to share.
 */
export default function PrintWeeklyReport() {
  const { doctorUid: professionalUid, from, to } = useParams<{ doctorUid: string; from: string; to: string }>()
  const { records, loading: recordsLoading } = useRecords()
  const { patients } = usePatients()
  const { professionals } = useProfessionals()
  const { entries: workLogEntries } = useWorkLog()

  const [attentions, setAttentions] = useState<Attention[] | null>(null)

  const professional = professionals.find((p) => p.uid === professionalUid)

  useEffect(() => {
    if (recordsLoading || !professionalUid || !from || !to || !professional) return
    let cancelled = false
    const build = async () => {
      switch (professional.role) {
        case 'medico': {
          const entriesByRecord = await fetchEntriesByRecord(records.map((r) => r.id))
          return buildWeeklyMedicalAttentions({ records, entriesByRecord, patients, authorUid: professionalUid, from, to })
        }
        case 'psicologo': {
          const entries = await fetchPsychologyEntries()
          return buildWeeklyPsychologyAttentions({ entries, patients, authorUid: professionalUid, from, to })
        }
        case 'trabajo_social': {
          const entries = await fetchSocialWorkEntries()
          return buildWeeklySocialAttentions({ entries, patients, authorUid: professionalUid, from, to })
        }
        case 'terapia_ocupacional': {
          const entries = await fetchOccupationalEntries()
          return buildWeeklyOccupationalAttentions({ entries, patients, authorUid: professionalUid, from, to })
        }
        default:
          return []
      }
    }
    build().then((result) => {
      if (!cancelled) setAttentions(result)
    })
    return () => {
      cancelled = true
    }
    // records/patients son suscripciones en vivo; volver a correr en cada
    // emisión recargaría constantemente. Se busca una sola vez que se conoce
    // el profesional y la semana.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsLoading, professionalUid, from, to, professional?.role])

  /** Bitácora de la semana: se imprime junto a las atenciones. */
  const activities = workLogEntries
    .filter((e) => e.authorId === professionalUid && from && to && e.date >= from && e.date <= to)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const professionalName = professional?.name ?? 'Profesional'
  const title = `Resumen semanal de atenciones — ${professionalName}`

  if (attentions === null) {
    return (
      <PrintLayout title={title}>
        <p className="text-sm text-slate-500">Cargando atenciones…</p>
      </PrintLayout>
    )
  }

  const uniquePatients = new Set(attentions.map((a) => a.patientId)).size
  const isMedical = !professional || professional.role === 'medico'
  const detailLabel = isMedical ? 'Diagnóstico' : 'Detalle'
  const treatmentLabel = isMedical ? 'Tratamiento' : 'Notas'

  return (
    <PrintLayout title={title}>
      <div className="space-y-6 text-sm">
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Profesional</p>
            <p className="text-sm text-slate-800">{professionalName}</p>
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
          {activities.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Otras actividades</p>
              <p className="text-sm text-slate-800">{activities.length}</p>
            </div>
          )}
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
                <th className="py-2 pr-2">{detailLabel}</th>
                <th className="py-2">{treatmentLabel}</th>
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

        {activities.length > 0 && (
          <section className="break-inside-avoid space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Otras actividades</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Actividad</th>
                  <th className="py-2 pr-2">Paciente</th>
                  <th className="py-2">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((a) => (
                  <tr key={a.id} className="break-inside-avoid align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">{a.date}</td>
                    <td className="py-2 pr-2">{a.activity}</td>
                    <td className="py-2 pr-2">{a.patientName || '—'}</td>
                    <td className="py-2 whitespace-pre-wrap">{a.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="break-inside-avoid pt-10 text-xs text-slate-500">
          <div className="grid grid-cols-2 gap-8">
            <div className="border-t border-slate-400 pt-2 text-center">Firma del profesional</div>
            <div className="border-t border-slate-400 pt-2 text-center">Sello del centro</div>
          </div>
        </footer>
      </div>
    </PrintLayout>
  )
}
