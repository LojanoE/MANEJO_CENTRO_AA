import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMspEntries } from '../../firebase/firestore'
import { useRecords } from '../../hooks/useRecords'
import { useAuthStore } from '../../stores/authStore'
import { MSP_FORM_LABELS, type MspFormType } from '../../types/medicalRecord'
import MspMigrationPanel from './MspMigrationPanel'

/**
 * Panel de entrada del Área Médica: una tarjeta por formulario MSP.
 * Cada tarjeta abre solo ese formulario (listado + nuevo registro), nada
 * mezclado. Las autorizaciones (024) y las fichas por paciente conservan
 * sus pantallas actuales, enlazadas desde aquí.
 */
export default function MedicalHome() {
  const navigate = useNavigate()
  const { records } = useRecords()
  const role = useAuthStore((s) => s.user?.role)
  const [counts, setCounts] = useState<Record<MspFormType, number> | null>(null)
  const [countError, setCountError] = useState(false)

  // Conteo por formulario: una sola lectura de todas las entradas (collection
  // group), agrupada en cliente. Acción puntual al abrir el panel, no en vivo.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const entries = await fetchMspEntries()
        if (cancelled) return
        const c: Record<MspFormType, number> = { '002': 0, '005': 0 }
        for (const e of entries) if (e.formType) c[e.formType]++
        setCounts(c)
        setCountError(false)
      } catch {
        if (!cancelled) setCountError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cards: {
    form: MspFormType
    icon: string
    desc: string
    accent: string
  }[] = [
    {
      form: '002',
      icon: '🩺',
      desc: 'Anamnesis, antecedentes, signos vitales, examen físico por sistemas y diagnóstico CIE-10.',
      accent: 'text-emerald-700',
    },
    {
      form: '005',
      icon: '📋',
      desc: 'Notas de evolución diaria y prescripciones (medicamento, dosis, vía, frecuencia, duración).',
      accent: 'text-blue-700',
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
          onClick={() => navigate('/medical/autorizaciones')}
          className="card-hover rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-left hover:border-emerald-300 transition"
        >
          <div className="flex items-start justify-between">
            <span className="text-3xl">✍️</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              MSP 024
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-amber-700">Autorizaciones y Consentimientos</h3>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Autorizaciones médicas, salidas y consentimientos informados del centro.
          </p>
        </button>
      </div>

      {role === 'admin' && <MspMigrationPanel />}
    </div>
  )
}
