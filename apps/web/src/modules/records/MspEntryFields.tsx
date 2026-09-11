import type { ChangeEvent } from 'react'
import {
  MSP_FORM_LABELS,
  SIGNOS_VITALES_LABELS,
  EXAMEN_FISICO_LABELS,
  EMPTY_SIGNOS_VITALES,
  type RecordEntryInput,
  type MspFormType,
  type DiagnosticoCie10,
  type Prescripcion,
} from '../../types/medicalRecord'

/**
 * Secciones del formulario MSP compartidas por "Abrir ficha" (002) y
 * "Nueva entrada" (002/005). Solo presentación: el estado vive en el padre,
 * que recibe patches parciales vía `onChange`.
 */

interface Props {
  form: RecordEntryInput
  onChange: (patch: Partial<RecordEntryInput>) => void
  /** Permite cambiar entre 002/005 dentro del formulario (solo en entradas nuevas). */
  allowFormSwitch?: boolean
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-emerald-800 border-b border-emerald-100 pb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-xs">{number}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

export default function MspEntryFields({ form, onChange, allowFormSwitch = false }: Props) {
  const formType: MspFormType = form.formType ?? '002'
  const diagnosticos = form.diagnosticos ?? []
  const prescripciones = form.prescripciones ?? []
  const signos = form.signosVitales ?? EMPTY_SIGNOS_VITALES
  const examen = form.examenFisico ?? {}

  const text =
    (key: keyof RecordEntryInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ [key]: e.target.value } as Partial<RecordEntryInput>)

  function setDiagnostico(idx: number, patch: Partial<DiagnosticoCie10>) {
    const next = diagnosticos.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    onChange({ diagnosticos: next })
  }
  function setPrescripcion(idx: number, patch: Partial<Prescripcion>) {
    const next = prescripciones.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    onChange({ prescripciones: next })
  }

  return (
    <div className="space-y-8">
      <Section number="1" title="Datos de la atención">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="form-label">Fecha de la atención *</label>
            <input type="date" value={form.date} onChange={text('date')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Formulario MSP *</label>
            <select
              value={formType}
              disabled={!allowFormSwitch}
              onChange={text('formType')}
              className="form-input disabled:bg-slate-50 disabled:text-slate-500"
            >
              {(Object.keys(MSP_FORM_LABELS) as MspFormType[]).map((f) => (
                <option key={f} value={f}>
                  {MSP_FORM_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Título *</label>
            <input
              value={form.title}
              onChange={text('title')}
              placeholder={formType === '002' ? 'Ej: Consulta de ingreso' : 'Ej: Nota de evolución — semana 7'}
              className="form-input"
              required
            />
          </div>
        </div>
      </Section>

      {formType === '002' && (
        <>
          <Section number="2" title="Anamnesis">
            <div>
              <label className="form-label">Motivo de consulta</label>
              <textarea
                value={form.motivoConsulta ?? ''}
                onChange={text('motivoConsulta')}
                placeholder="Motivo principal por el que se atiende al paciente…"
                className="form-textarea"
              />
            </div>
            <div>
              <label className="form-label">Enfermedad o problema actual</label>
              <textarea
                value={form.enfermedadActual ?? ''}
                onChange={text('enfermedadActual')}
                placeholder="Historia de consumo, síntomas actuales, factores desencadenantes…"
                className="form-textarea"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Antecedentes personales</label>
                <textarea
                  value={form.antecedentesPersonales ?? ''}
                  onChange={text('antecedentesPersonales')}
                  placeholder="Enfermedades previas, alergias, cirugías, tratamientos…"
                  className="form-textarea"
                />
              </div>
              <div>
                <label className="form-label">Antecedentes familiares</label>
                <textarea
                  value={form.antecedentesFamiliares ?? ''}
                  onChange={text('antecedentesFamiliares')}
                  placeholder="Antecedentes de consumo o enfermedad en la familia…"
                  className="form-textarea"
                />
              </div>
            </div>
          </Section>

          <Section number="3" title="Signos vitales">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SIGNOS_VITALES_LABELS.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    value={signos[key]}
                    onChange={(e) => onChange({ signosVitales: { ...signos, [key]: e.target.value } })}
                    placeholder={hint}
                    className="form-input"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section number="4" title="Examen físico por sistemas">
            <div>
              <label className="form-label">{EXAMEN_FISICO_LABELS[0].label}</label>
              <textarea
                value={examen.general ?? ''}
                onChange={(e) => onChange({ examenFisico: { ...examen, general: e.target.value } })}
                placeholder="Conciencia, orientación, lenguaje, afecto, conducta…"
                className="form-textarea"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {EXAMEN_FISICO_LABELS.slice(1).map(({ key, label }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <textarea
                    value={examen[key] ?? ''}
                    onChange={(e) => onChange({ examenFisico: { ...examen, [key]: e.target.value } })}
                    className="form-textarea"
                  />
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {formType === '005' && (
        <Section number="2" title="Evolución">
          <div>
            <label className="form-label">Nota de evolución</label>
            <textarea
              value={form.evolucion ?? ''}
              onChange={text('evolucion')}
              placeholder="Subjetivo, objetivo, análisis y evolución del paciente…"
              className="form-textarea min-h-32"
            />
          </div>
        </Section>
      )}

      <Section number={formType === '002' ? '5' : '3'} title="Diagnósticos (CIE-10)">
        {diagnosticos.length === 0 && (
          <p className="text-sm text-slate-400">Sin diagnósticos registrados.</p>
        )}
        <div className="space-y-3">
          {diagnosticos.map((d, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[140px_1fr_150px_40px] gap-3 items-end">
              <div>
                <label className="form-label">CIE-10</label>
                <input
                  value={d.codigo}
                  onChange={(e) => setDiagnostico(idx, { codigo: e.target.value })}
                  placeholder="F10.2"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Descripción</label>
                <input
                  value={d.descripcion}
                  onChange={(e) => setDiagnostico(idx, { descripcion: e.target.value })}
                  placeholder="Ej: Trastorno por uso de alcohol"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Tipo</label>
                <select
                  value={d.tipo}
                  onChange={(e) => setDiagnostico(idx, { tipo: e.target.value as DiagnosticoCie10['tipo'] })}
                  className="form-input"
                >
                  <option>Presuntivo</option>
                  <option>Definitivo</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => onChange({ diagnosticos: diagnosticos.filter((_, i) => i !== idx) })}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                title="Quitar diagnóstico"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({ diagnosticos: [...diagnosticos, { codigo: '', descripcion: '', tipo: 'Presuntivo' }] })
          }
          className="btn-secondary text-sm"
        >
          + Agregar diagnóstico
        </button>
      </Section>

      {formType === '005' && (
        <Section number="4" title="Prescripciones">
          {prescripciones.length === 0 && (
            <p className="text-sm text-slate-400">Sin prescripciones registradas.</p>
          )}
          <div className="space-y-3">
            {prescripciones.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold uppercase text-slate-400">Prescripción {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => onChange({ prescripciones: prescripciones.filter((_, i) => i !== idx) })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition text-xs"
                    title="Quitar prescripción"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Medicamento</label>
                    <input
                      value={p.medicamento}
                      onChange={(e) => setPrescripcion(idx, { medicamento: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Dosis</label>
                    <input
                      value={p.dosis}
                      onChange={(e) => setPrescripcion(idx, { dosis: e.target.value })}
                      placeholder="Ej: 50 mg"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Vía</label>
                    <input
                      value={p.via}
                      onChange={(e) => setPrescripcion(idx, { via: e.target.value })}
                      placeholder="Oral, IM, IV…"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Frecuencia</label>
                    <input
                      value={p.frecuencia}
                      onChange={(e) => setPrescripcion(idx, { frecuencia: e.target.value })}
                      placeholder="Cada 8 horas…"
                      className="form-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Duración</label>
                    <input
                      value={p.duracion}
                      onChange={(e) => setPrescripcion(idx, { duracion: e.target.value })}
                      placeholder="Ej: 7 días"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                prescripciones: [
                  ...prescripciones,
                  { medicamento: '', dosis: '', via: '', frecuencia: '', duracion: '' },
                ],
              })
            }
            className="btn-secondary text-sm"
          >
            + Agregar prescripción
          </button>
        </Section>
      )}

      <Section number={formType === '002' ? '6' : '5'} title="Plan y observaciones">
        <div>
          <label className="form-label">Plan de tratamiento</label>
          <textarea
            value={form.planTratamiento ?? ''}
            onChange={text('planTratamiento')}
            placeholder="Terapias, medicación indicada, seguimiento…"
            className="form-textarea"
          />
        </div>
        {formType === '002' && (
          <div>
            <label className="form-label">Evolución y pronóstico</label>
            <textarea
              value={form.evolucion ?? ''}
              onChange={text('evolucion')}
              placeholder="Evolución esperada, riesgo de recaída…"
              className="form-textarea"
            />
          </div>
        )}
        <div>
          <label className="form-label">Observaciones y recomendaciones</label>
          <textarea
            value={form.observaciones ?? ''}
            onChange={text('observaciones')}
            placeholder="Notas para el equipo, alertas, manejo familiar…"
            className="form-textarea"
          />
        </div>
      </Section>
    </div>
  )
}
