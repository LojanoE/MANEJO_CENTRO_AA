import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePermissions } from '../../hooks/usePermissions'
import PatientSelect from '../../components/ui/PatientSelect'
import { AREA_LABELS, FLOW_STEPS, PRINTABLE_FORMS, type PrintableForm } from '../../config/printableForms'
import type { FormArea } from '../../config/formTemplates/types'

const AREA_STYLE: Record<FormArea, string> = {
  admision: 'bg-slate-100 text-slate-600',
  medica: 'bg-emerald-50 text-emerald-700',
  psicologia: 'bg-violet-50 text-violet-700',
  social: 'bg-amber-50 text-amber-700',
  ocupacional: 'bg-sky-50 text-sky-700',
}

const linkBtn = 'inline-flex items-center justify-center text-xs'

/**
 * Formatos del expediente ordenados por el recorrido del usuario en el centro.
 * Con un paciente elegido cada formato se imprime pre-llenado; sin paciente,
 * en blanco. El paciente viaja en `?paciente=` para poder enlazar desde su ficha.
 */
export default function MedicalFormats() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { patients } = usePatients()
  const { records } = useRecords()
  const { can } = usePermissions()

  const patientId = params.get('paciente')
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const digitalCount = PRINTABLE_FORMS.filter((f) => f.digital).length

  function selectPatient(id: string | null) {
    setParams(id ? { paciente: id } : {}, { replace: true })
  }

  function printHref(form: PrintableForm, withPatient: boolean) {
    if (withPatient && patient && form.filledPrintPath) return form.filledPrintPath(patient.id)
    return `#/print/formato/${form.id}${withPatient && patient ? `/${patient.id}` : ''}`
  }

  /** Registrar un formulario digital para el paciente elegido (según el catálogo). */
  function register(form: PrintableForm) {
    if (!patient || !form.register) return
    navigate(form.register.path({ patientId: patient.id, recordId: record?.id }))
  }

  const canRegister = (form: PrintableForm) => Boolean(form.register && can(form.register.module, form.register.action))

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/medical')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver al Área Médica
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Formatos del expediente</h2>
        <p className="text-slate-500">
          Todos los formatos del centro en el orden del recorrido del usuario. Imprímalos con los datos del paciente o en
          blanco.
        </p>
      </div>

      <div className="mb-8 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-4 lg:items-end">
          <div>
            <label className="form-label">Paciente</label>
            <PatientSelect patients={patients} value={patientId} onChange={selectPatient} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {patient ? (
              <>
                <a
                  href={`#/print/patient-file/${patient.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`btn-secondary ${linkBtn}`}
                >
                  📄 Expediente completo
                </a>
                {record && (
                  <>
                    <button onClick={() => navigate(`/records/${record.id}`)} className="btn-secondary text-xs">
                      🗂️ Historia clínica
                    </button>
                    <a
                      href={`#/print/msp005/${record.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`btn-secondary ${linkBtn}`}
                    >
                      🖨️ Hoja 005 con registros
                    </a>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-700">Sin paciente seleccionado, los formatos se imprimen en blanco.</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {digitalCount} formatos ya se registran en el sistema
          {digitalCount < PRINTABLE_FORMS.length &&
            ` · ${PRINTABLE_FORMS.length - digitalCount} por ahora solo se imprimen y se irán digitalizando por fases`}
          .
        </p>
      </div>

      {FLOW_STEPS.map((step, i) => {
        const forms = PRINTABLE_FORMS.filter((f) => f.step === step.id)
        if (forms.length === 0) return null
        return (
          <section key={step.id} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold text-slate-800">{step.title}</h3>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {forms.map((form) => (
                <div key={form.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl">{form.icon}</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {form.code && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {form.code}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${AREA_STYLE[form.area]}`}>
                        {AREA_LABELS[form.area]}
                      </span>
                    </div>
                  </div>
                  <h4 className="mt-2 font-bold text-slate-800">{form.title}</h4>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{form.description}</p>
                  <p className={`mt-3 text-[11px] font-bold ${form.digital ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {form.digital ? '✅ Digital: se registra en el sistema' : `🖨️ Solo impresión · digital en la Fase ${form.phase}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={printHref(form, true)} target="_blank" rel="noreferrer" className={`btn-primary ${linkBtn}`}>
                      {patient ? (form.filledPrintPath ? '🖨️ Con registros' : '🖨️ Pre-llenado') : '🖨️ En blanco'}
                    </a>
                    {patient && (
                      <a href={printHref(form, false)} target="_blank" rel="noreferrer" className={`btn-secondary ${linkBtn}`}>
                        En blanco
                      </a>
                    )}
                    {patient && canRegister(form) && (
                      <button onClick={() => register(form)} className="btn-secondary text-xs">
                        {form.register?.label}
                      </button>
                    )}
                    {form.digitalPath && !patient && (
                      <button onClick={() => navigate(form.digitalPath!)} className="btn-secondary text-xs">
                        Ver registros
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
