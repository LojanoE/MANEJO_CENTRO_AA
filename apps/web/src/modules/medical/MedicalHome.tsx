import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMspEntries } from '../../firebase/firestore'
import { useRecords } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useAuthStore } from '../../stores/authStore'
import { MSP_FORM_LABELS, type MspFormType, type RecordEntry } from '../../types/medicalRecord'
import { PRINTABLE_FORMS } from '../../config/printableForms'
import { admissionMissingFields } from '../../utils/admission'
import PendingList, { type PendingItem } from '../../components/ui/PendingList'
import MspMigrationPanel from './MspMigrationPanel'

/**
 * Panel de entrada del Área Médica: una tarjeta por formulario MSP de la
 * historia clínica, los accesos al resto del expediente y los pendientes del
 * flujo (altas sin epicrisis, admisiones incompletas).
 */
export default function MedicalHome() {
  const navigate = useNavigate()
  const { records } = useRecords()
  const { patients } = usePatients()
  const role = useAuthStore((s) => s.user?.role)
  const [entries, setEntries] = useState<RecordEntry[] | null>(null)
  const [countError, setCountError] = useState(false)

  // Una sola lectura de todas las entradas (collection group) al abrir el
  // panel, no en vivo: alimenta los contadores y los pendientes.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchMspEntries()
        if (cancelled) return
        setEntries(list)
        setCountError(false)
      } catch {
        if (!cancelled) setCountError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    if (!entries) return null
    const c: Record<MspFormType, number> = { '002': 0, '005': 0, '006': 0 }
    for (const e of entries) if (e.formType) c[e.formType]++
    return c
  }, [entries])

  const pending = useMemo(() => {
    if (!entries) return null
    const withEpicrisis = new Set(entries.filter((e) => e.formType === '006').map((e) => e.recordId))
    const recordByPatient = new Map(records.map((r) => [r.patientId, r]))

    const altasSinEpicrisis: PendingItem[] = patients
      .filter((p) => p.status === 'Alta')
      .flatMap((p) => {
        const record = recordByPatient.get(p.id)
        if (record && withEpicrisis.has(record.id)) return []
        return [
          {
            id: p.id,
            label: p.name,
            detail: record ? 'Generar epicrisis' : 'Sin historia clínica',
            action: () => navigate(record ? `/records/${record.id}/entry?form=006` : `/patients/${p.id}`),
          },
        ]
      })

    const admisionesIncompletas: PendingItem[] = patients
      .filter((p) => p.status === 'Activo' || p.status === 'Nuevo')
      .flatMap((p) => {
        const missing = admissionMissingFields(p).length
        if (missing === 0) return []
        return [
          {
            id: p.id,
            label: p.name,
            detail: `Faltan ${missing} datos`,
            action: () => navigate(`/patients/${p.id}/admision`),
          },
        ]
      })

    return { altasSinEpicrisis, admisionesIncompletas }
  }, [entries, records, patients, navigate])

  const cards: { form: MspFormType; icon: string; desc: string; accent: string }[] = [
    {
      form: '002',
      icon: '🩺',
      desc: 'Anamnesis, antecedentes, constantes vitales, revisión de sistemas, examen físico y diagnóstico CIE-10.',
      accent: 'text-emerald-700',
    },
    {
      form: '005',
      icon: '📋',
      desc: 'Notas de evolución, prescripciones con administración e indicaciones para enfermería.',
      accent: 'text-blue-700',
    },
    {
      form: '006',
      icon: '🏁',
      desc: 'Resumen del internamiento al dar el alta: se genera como borrador desde la historia clínica.',
      accent: 'text-rose-700',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Área Médica</h2>
        <p className="text-slate-500">Formularios de la Historia Clínica Única — Ministerio de Salud Pública</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {cards.map(({ form, icon, desc, accent }) => (
          <button
            key={form}
            onClick={() => navigate(`/medical/formularios/${form}`)}
            className="card-hover rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-left hover:border-emerald-300 transition"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{icon}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                MSP {form}
              </span>
            </div>
            <h3 className={`mt-3 text-lg font-bold ${accent}`}>{MSP_FORM_LABELS[form]}</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{desc}</p>
            <p className="mt-3 text-xs font-bold text-slate-400">
              {counts ? `${counts[form]} registros` : countError ? 'No se pudo contar' : '…'}
            </p>
          </button>
        ))}

        <button
          onClick={() => navigate('/records')}
          className="card-hover rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-left hover:border-emerald-300 transition"
        >
          <div className="flex items-start justify-between">
            <span className="text-3xl">🗂️</span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-violet-700">Historias Clínicas por Paciente</h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Fichas abiertas por paciente: ver el historial completo o abrir una historia nueva.
          </p>
          <p className="mt-3 text-xs font-bold text-slate-400">{records.length} historias abiertas</p>
        </button>

        <button
          onClick={() => navigate('/medical/formatos')}
          className="card-hover rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-left hover:border-emerald-300 transition"
        >
          <div className="flex items-start justify-between">
            <span className="text-3xl">🖨️</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {PRINTABLE_FORMS.length} formatos
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-fuchsia-700">Formatos del expediente</h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Admisión, médica, psicología, trabajo social y ocupacional: imprimir con los datos del paciente o en blanco.
          </p>
        </button>

        <button
          onClick={() => navigate('/medical/autorizaciones')}
          className="card-hover rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-left hover:border-emerald-300 transition"
        >
          <div className="flex items-start justify-between">
            <span className="text-3xl">✍️</span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-amber-700">Autorizaciones de visita y salida</h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Autorizaciones médicas para visitas familiares, visitas externas y salidas supervisadas.
          </p>
        </button>
      </div>

      {pending && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-500">Pendientes del expediente</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PendingList title="🏁 Altas sin epicrisis (MSP 006)" tone="rose" items={pending.altasSinEpicrisis} />
            <PendingList title="🪪 Admisiones incompletas (MSP 001)" tone="amber" items={pending.admisionesIncompletas} />
          </div>
        </div>
      )}

      {role === 'admin' && <MspMigrationPanel />}
    </div>
  )
}
