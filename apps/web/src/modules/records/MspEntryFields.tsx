import type { ChangeEvent, ReactNode } from 'react'
import {
  MSP_FORM_LABELS,
  SIGNOS_VITALES_LABELS,
  EXAMEN_FISICO_REGIONAL,
  EXAMEN_FISICO_SISTEMICO,
  REVISION_SISTEMAS_LABELS,
  ANTECEDENTES_CATEGORIAS,
  EMPTY_SIGNOS_VITALES,
  ESTADOS_EGRESO,
  TIPOS_EGRESO,
  type AntecedenteCategoria,
  type RecordEntryInput,
  type MspFormType,
  type DiagnosticoCie10,
  type MedicoTratante,
  type Prescripcion,
  type SignosVitales,
  type TipoConsulta,
} from '../../types/medicalRecord'
import { computeImc } from '../../utils/clinicalPrint'
import { daysBetween } from '../../utils/date'
import ToggleChip from '../../components/ui/ToggleChip'

/**
 * Secciones de los formularios MSP que viven en la historia clínica:
 * 002 (consulta), 005 (evolución) y 006 (epicrisis). Solo presentación: el
 * estado vive en el padre, que recibe patches parciales vía `onChange`.
 *
 * Los títulos llevan las letras/números de las secciones del papel para que
 * el médico las reconozca al imprimir.
 */

interface Props {
  form: RecordEntryInput
  onChange: (patch: Partial<RecordEntryInput>) => void
  /** Permite cambiar entre 002/005 dentro del formulario (solo en entradas nuevas). */
  allowFormSwitch?: boolean
}

type MarkMap = Partial<Record<string, string>>
type CodedItem = { key: string; code: string; label: string }

function Section({ number, title, hint, children }: { number: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-emerald-100 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-emerald-800">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-emerald-100 px-1 text-emerald-700 text-xs">
            {number}
          </span>
          {title}
        </h3>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Sistemas marcables "con patología": al marcar aparece su campo de descripción. */
function MarkableList({
  items,
  value,
  onChange,
  placeholder,
}: {
  items: CodedItem[]
  value: MarkMap | undefined
  onChange: (next: MarkMap) => void
  placeholder: string
}) {
  const map: MarkMap = value ?? {}
  const marked = items.filter((it) => typeof map[it.key] === 'string')

  function toggle(key: string) {
    const next = { ...map }
    if (typeof next[key] === 'string') delete next[key]
    else next[key] = ''
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <ToggleChip
            key={it.key}
            code={it.code}
            label={it.label}
            active={typeof map[it.key] === 'string'}
            onClick={() => toggle(it.key)}
          />
        ))}
      </div>
      {marked.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {marked.map((it) => (
            <div key={it.key}>
              <label className="form-label">
                {it.code} {it.label}
              </label>
              <input
                value={map[it.key] ?? ''}
                onChange={(e) => onChange({ ...map, [it.key]: e.target.value })}
                placeholder={placeholder}
                className="form-input"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiagnosticosEditor({ list, onChange }: { list: DiagnosticoCie10[]; onChange: (next: DiagnosticoCie10[]) => void }) {
  const set = (idx: number, patch: Partial<DiagnosticoCie10>) => onChange(list.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-sm text-slate-400">Sin diagnósticos registrados.</p>}
      {list.map((d, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-[140px_1fr_150px_40px] gap-3 items-end">
          <div>
            <label className="form-label">CIE-10</label>
            <input value={d.codigo} onChange={(e) => set(idx, { codigo: e.target.value })} placeholder="F10.2" className="form-input" />
          </div>
          <div>
            <label className="form-label">Descripción</label>
            <input
              value={d.descripcion}
              onChange={(e) => set(idx, { descripcion: e.target.value })}
              placeholder="Ej: Trastorno por uso de alcohol"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select
              value={d.tipo}
              onChange={(e) => set(idx, { tipo: e.target.value as DiagnosticoCie10['tipo'] })}
              className="form-input"
            >
              <option>Presuntivo</option>
              <option>Definitivo</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => onChange(list.filter((_, i) => i !== idx))}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            title="Quitar diagnóstico"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...list, { codigo: '', descripcion: '', tipo: 'Presuntivo' }])}
        className="btn-secondary text-sm"
      >
        + Agregar diagnóstico
      </button>
    </div>
  )
}

function MedicosTratantesEditor({ list, onChange }: { list: MedicoTratante[]; onChange: (next: MedicoTratante[]) => void }) {
  const set = (idx: number, patch: Partial<MedicoTratante>) => onChange(list.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-sm text-slate-400">Sin médicos tratantes registrados.</p>}
      {list.map((m, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_180px_130px_220px_40px] gap-3 items-end">
          <div>
            <label className="form-label">Nombres</label>
            <input value={m.nombre} onChange={(e) => set(idx, { nombre: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Especialidad</label>
            <input value={m.especialidad} onChange={(e) => set(idx, { especialidad: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Código</label>
            <input value={m.codigo} onChange={(e) => set(idx, { codigo: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Periodo de responsabilidad</label>
            <input
              value={m.periodo}
              onChange={(e) => set(idx, { periodo: e.target.value })}
              placeholder="2026-09-01 a 2026-09-30"
              className="form-input"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(list.filter((_, i) => i !== idx))}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            title="Quitar médico"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...list, { nombre: '', especialidad: '', codigo: '', periodo: '' }])}
        className="btn-secondary text-sm"
      >
        + Agregar médico
      </button>
    </div>
  )
}

const TITLE_PLACEHOLDER: Record<MspFormType, string> = {
  '002': 'Ej: Consulta de ingreso',
  '005': 'Ej: Nota de evolución — semana 7',
  '006': 'Ej: Epicrisis — alta definitiva',
}

export default function MspEntryFields({ form, onChange, allowFormSwitch = false }: Props) {
  const formType: MspFormType = form.formType ?? '002'
  const prescripciones = form.prescripciones ?? []
  const signos: SignosVitales = { ...EMPTY_SIGNOS_VITALES, ...form.signosVitales }
  const examen = (form.examenFisico ?? {}) as MarkMap
  const diasEstada = daysBetween(form.fechaIngreso, form.fechaEgreso)

  const text =
    (key: keyof RecordEntryInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ [key]: e.target.value } as Partial<RecordEntryInput>)

  function setPrescripcion(idx: number, patch: Partial<Prescripcion>) {
    const next = prescripciones.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    onChange({ prescripciones: next })
  }
  function setSigno(key: keyof SignosVitales, value: string) {
    const next: SignosVitales = { ...signos, [key]: value }
    if (key === 'peso' || key === 'talla') {
      const imc = computeImc(next.peso, next.talla)
      if (imc) next.imc = imc
    }
    onChange({ signosVitales: next })
  }
  function toggleAntecedente(field: 'antecedentesPersonalesMarcados' | 'antecedentesFamiliaresMarcados', c: AntecedenteCategoria) {
    const list = form[field] ?? []
    onChange({ [field]: list.includes(c) ? list.filter((x) => x !== c) : [...list, c] })
  }

  // La epicrisis no se elige desde aquí: se abre desde la historia clínica con su borrador.
  const formOptions = (Object.keys(MSP_FORM_LABELS) as MspFormType[]).filter((f) => f !== '006' || formType === '006')

  return (
    <div className="space-y-8">
      <Section number="1" title="Datos de la atención">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="form-label">{formType === '006' ? 'Fecha de elaboración *' : 'Fecha *'}</label>
            <input type="date" value={form.date} onChange={text('date')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Hora</label>
            <input type="time" value={form.hora ?? ''} onChange={text('hora')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Formulario MSP *</label>
            <select
              value={formType}
              disabled={!allowFormSwitch || formType === '006'}
              onChange={text('formType')}
              className="form-input disabled:bg-slate-50 disabled:text-slate-500"
            >
              {formOptions.map((f) => (
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
              placeholder={TITLE_PLACEHOLDER[formType]}
              className="form-input"
              required
            />
          </div>
        </div>
        {formType === '002' && (
          <div>
            <label className="form-label">Tipo de consulta</label>
            <div className="flex gap-2">
              {(['Primera', 'Subsecuente'] as TipoConsulta[]).map((t) => (
                <ToggleChip key={t} label={t} active={form.tipoConsulta === t} onClick={() => onChange({ tipoConsulta: t })} />
              ))}
            </div>
          </div>
        )}
      </Section>

      {formType === '002' && (
        <>
          <Section number="2" title="B · E — Motivo de consulta y problema actual">
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
                placeholder="Cronología, localización, características, intensidad, frecuencia, factores agravantes…"
                className="form-textarea"
              />
            </div>
          </Section>

          <Section number="3" title="C · D — Antecedentes patológicos" hint="Marque las categorías presentes y describa.">
            {(
              [
                ['antecedentesPersonalesMarcados', 'antecedentesPersonales', 'Personales', 'Datos clínico-quirúrgicos, obstétricos, alérgicos relevantes…'],
                ['antecedentesFamiliaresMarcados', 'antecedentesFamiliares', 'Familiares', 'Antecedentes de consumo o enfermedad en la familia…'],
              ] as const
            ).map(([marcados, texto, label, placeholder]) => (
              <div key={marcados} className="space-y-2">
                <label className="form-label">Antecedentes {label.toLowerCase()}</label>
                <div className="flex flex-wrap gap-2">
                  {ANTECEDENTES_CATEGORIAS.map((c) => (
                    <ToggleChip
                      key={c}
                      label={c}
                      active={(form[marcados] ?? []).includes(c)}
                      onClick={() => toggleAntecedente(marcados, c)}
                    />
                  ))}
                </div>
                <textarea value={form[texto] ?? ''} onChange={text(texto)} placeholder={placeholder} className="form-textarea" />
              </div>
            ))}
          </Section>

          <Section number="4" title="F — Constantes vitales y antropometría" hint="El IMC se calcula solo con el peso y la talla.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SIGNOS_VITALES_LABELS.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    value={signos[key] ?? ''}
                    onChange={(e) => setSigno(key, e.target.value)}
                    placeholder={hint}
                    className="form-input"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            number="5"
            title="G — Revisión actual de órganos y sistemas"
            hint="Marque solo los sistemas con patología y describa. Lo no marcado se imprime sin X."
          >
            <MarkableList
              items={REVISION_SISTEMAS_LABELS}
              value={form.revisionSistemas as MarkMap | undefined}
              onChange={(next) => onChange({ revisionSistemas: next })}
              placeholder="Describa la patología…"
            />
          </Section>

          <Section number="6" title="H — Examen físico" hint="Marque las regiones y sistemas con patología y describa.">
            <div>
              <label className="form-label">Examen general / estado mental</label>
              <textarea
                value={examen.general ?? ''}
                onChange={(e) => onChange({ examenFisico: { ...examen, general: e.target.value } })}
                placeholder="Conciencia, orientación, lenguaje, afecto, conducta…"
                className="form-textarea"
              />
            </div>
            <div className="space-y-2">
              <p className="form-label">Regional</p>
              <MarkableList
                items={EXAMEN_FISICO_REGIONAL}
                value={examen}
                onChange={(next) => onChange({ examenFisico: next })}
                placeholder="Hallazgo…"
              />
            </div>
            <div className="space-y-2">
              <p className="form-label">Sistémico</p>
              <MarkableList
                items={EXAMEN_FISICO_SISTEMICO}
                value={examen}
                onChange={(next) => onChange({ examenFisico: next })}
                placeholder="Hallazgo…"
              />
            </div>
            {typeof examen.extremidades === 'string' && examen.extremidades.trim() && (
              <div>
                <label className="form-label">Extremidades (registro anterior)</label>
                <textarea
                  value={examen.extremidades}
                  onChange={(e) => onChange({ examenFisico: { ...examen, extremidades: e.target.value } })}
                  className="form-textarea"
                />
              </div>
            )}
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

      {formType === '006' && (
        <>
          <Section number="2" title="Internamiento" hint="Fechas del internamiento que se cierra con esta epicrisis.">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="form-label">Fecha de ingreso</label>
                <input type="date" value={form.fechaIngreso ?? ''} onChange={text('fechaIngreso')} className="form-input" />
              </div>
              <div>
                <label className="form-label">Fecha de egreso</label>
                <input type="date" value={form.fechaEgreso ?? ''} onChange={text('fechaEgreso')} className="form-input" />
              </div>
              <div>
                <label className="form-label">Días de estada</label>
                <input value={diasEstada ?? ''} readOnly className="form-input bg-slate-100 text-slate-600" />
              </div>
              <div>
                <label className="form-label">Días de incapacidad</label>
                <input value={form.diasIncapacidad ?? ''} onChange={text('diasIncapacidad')} className="form-input" />
              </div>
            </div>
          </Section>

          <Section number="3" title="1 · 2 — Cuadro clínico y evolución">
            <div>
              <label className="form-label">Resumen del cuadro clínico</label>
              <textarea
                value={form.resumenCuadroClinico ?? ''}
                onChange={text('resumenCuadroClinico')}
                className="form-textarea min-h-28"
              />
            </div>
            <div>
              <label className="form-label">Resumen de evolución y complicaciones</label>
              <textarea value={form.resumenEvolucion ?? ''} onChange={text('resumenEvolucion')} className="form-textarea min-h-40" />
            </div>
          </Section>

          <Section number="4" title="3 · 4 — Hallazgos y tratamiento">
            <div>
              <label className="form-label">Hallazgos relevantes de exámenes y procedimientos diagnósticos</label>
              <textarea value={form.hallazgosRelevantes ?? ''} onChange={text('hallazgosRelevantes')} className="form-textarea min-h-28" />
            </div>
            <div>
              <label className="form-label">Resumen de tratamiento y procedimientos terapéuticos</label>
              <textarea value={form.resumenTratamiento ?? ''} onChange={text('resumenTratamiento')} className="form-textarea min-h-28" />
            </div>
          </Section>

          <Section number="5" title="5 · 6 — Diagnósticos de ingreso y egreso">
            <div className="space-y-2">
              <p className="form-label">Diagnósticos de ingreso</p>
              <DiagnosticosEditor list={form.diagnosticosIngreso ?? []} onChange={(l) => onChange({ diagnosticosIngreso: l })} />
            </div>
            <div className="space-y-2">
              <p className="form-label">Diagnósticos de egreso</p>
              <DiagnosticosEditor list={form.diagnosticosEgreso ?? []} onChange={(l) => onChange({ diagnosticosEgreso: l })} />
            </div>
          </Section>

          <Section number="6" title="7 · 9 — Condiciones de egreso">
            <div>
              <label className="form-label">Condiciones de egreso y pronóstico</label>
              <textarea value={form.condicionesEgreso ?? ''} onChange={text('condicionesEgreso')} className="form-textarea" />
            </div>
            <div>
              <label className="form-label">Tipo de egreso</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_EGRESO.map((t) => (
                  <ToggleChip key={t} label={t} active={form.tipoEgreso === t} onClick={() => onChange({ tipoEgreso: t })} />
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Estado al egreso</label>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_EGRESO.map((s) => (
                  <ToggleChip key={s} label={s} active={form.estadoEgreso === s} onClick={() => onChange({ estadoEgreso: s })} />
                ))}
              </div>
            </div>
          </Section>

          <Section number="7" title="8 — Médicos tratantes">
            <MedicosTratantesEditor list={form.medicosTratantes ?? []} onChange={(l) => onChange({ medicosTratantes: l })} />
          </Section>
        </>
      )}

      {formType !== '006' && (
        <Section number={formType === '002' ? '7' : '3'} title={formType === '002' ? 'I — Diagnósticos (CIE-10)' : 'Diagnósticos (CIE-10)'}>
          <DiagnosticosEditor list={form.diagnosticos ?? []} onChange={(l) => onChange({ diagnosticos: l })} />
        </Section>
      )}

      {formType === '005' && (
        <Section
          number="4"
          title="Prescripciones e indicaciones"
          hint="Marque 'Administrado' cuando se aplicó el fármaco o dispositivo: en la hoja 005 se imprime en rojo."
        >
          {prescripciones.length === 0 && <p className="text-sm text-slate-400">Sin prescripciones registradas.</p>}
          <div className="space-y-3">
            {prescripciones.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold uppercase text-slate-400">Prescripción {idx + 1}</p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-red-700">
                      <input
                        type="checkbox"
                        checked={p.administrado ?? false}
                        onChange={(e) => setPrescripcion(idx, { administrado: e.target.checked })}
                        className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                      />
                      Administrado
                    </label>
                    <button
                      type="button"
                      onClick={() => onChange({ prescripciones: prescripciones.filter((_, i) => i !== idx) })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition text-xs"
                      title="Quitar prescripción"
                    >
                      ✕
                    </button>
                  </div>
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
                  { medicamento: '', dosis: '', via: '', frecuencia: '', duracion: '', administrado: false },
                ],
              })
            }
            className="btn-secondary text-sm"
          >
            + Agregar prescripción
          </button>
          <div>
            <label className="form-label">Indicaciones (para enfermería y otros profesionales)</label>
            <textarea
              value={form.indicaciones ?? ''}
              onChange={text('indicaciones')}
              placeholder="Dieta, controles, cuidados, actividades…"
              className="form-textarea"
            />
          </div>
        </Section>
      )}

      {formType !== '006' && (
        <Section
          number={formType === '002' ? '8' : '5'}
          title={formType === '002' ? 'J — Plan de tratamiento y observaciones' : 'Plan y observaciones'}
        >
          <div>
            <label className="form-label">Plan de tratamiento</label>
            <textarea
              value={form.planTratamiento ?? ''}
              onChange={text('planTratamiento')}
              placeholder="Diagnóstico, terapéutico y educacional…"
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
      )}
    </div>
  )
}
