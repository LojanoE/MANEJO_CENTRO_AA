import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientAdmissions } from '../../hooks/useAdmissions'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import { useAuthStore } from '../../stores/authStore'
import { ageFromBirthDate, todayISO } from '../../utils/date'
import { hcNumber } from '../../utils/clinicalPrint'
import {
  CULTURAL_GROUPS,
  INSURANCE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  admissionMissingFields,
  composeName,
} from '../../utils/admission'
import { validatePatientInput } from '../../schemas/patient'
import type { EmergencyContact, Patient, PatientInput, PatientSex, PatientZone } from '../../types/patient'
import type { Admission, TrackedChangeField } from '../../types/admission'

/** Campos de texto del MSP 001 editables en esta pantalla. */
const TEXT_KEYS = [
  'fatherSurname',
  'motherSurname',
  'firstName',
  'middleName',
  'name',
  'idCard',
  'birthDate',
  'birthPlace',
  'nationality',
  'culturalGroup',
  'maritalStatus',
  'education',
  'occupation',
  'employer',
  'insurance',
  'address',
  'neighborhood',
  'parish',
  'canton',
  'province',
  'phone',
  'referredBy',
  'admittedByName',
  'additionalInfo',
] as const
type TextKey = (typeof TEXT_KEYS)[number]

type AdmissionForm = Record<TextKey, string> & { sex: PatientSex; zone: PatientZone; emergencyContact: EmergencyContact }

const CHANGE_LABELS: Record<TrackedChangeField, string> = {
  maritalStatus: 'Estado civil',
  education: 'Instrucción',
  occupation: 'Ocupación',
  employer: 'Empresa',
  insurance: 'Seguro',
  address: 'Dirección',
  neighborhood: 'Barrio',
  parish: 'Parroquia',
  canton: 'Cantón',
  province: 'Provincia',
  phone: 'Teléfono',
}

function toForm(p: Patient): AdmissionForm {
  const text = Object.fromEntries(TEXT_KEYS.map((k) => [k, p[k] ?? ''])) as Record<TextKey, string>
  return {
    ...text,
    sex: p.sex ?? '',
    zone: p.zone ?? '',
    emergencyContact: { name: '', relationship: '', phone: '', address: '', ...p.emergencyContact },
  }
}

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  )
}

function Field({ label, span = 1, children }: { label: string; span?: 1 | 2 | 4; children: ReactNode }) {
  const cls = span === 2 ? 'md:col-span-2' : span === 4 ? 'md:col-span-2 lg:col-span-4' : ''
  return (
    <div className={cls}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

/**
 * Formulario MSP 001 Admisión de un paciente: datos de identificación y
 * residencia, reingresos (sección 2) y registro de cambios automático (sección 3).
 */
export default function PatientAdmission() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { patients, loading, update } = usePatients()
  const { records } = useRecords()
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { admissions, openAdmission, changes, addReadmission, removeAdmission } = usePatientAdmissions(patient)
  const { can } = usePermissions()
  const canEdit = can('patients', 'edit')
  const toast = useToast()
  const confirm = useConfirm()
  const userName = useAuthStore((s) => s.user?.name ?? '')

  const [form, setForm] = useState<AdmissionForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readmit, setReadmit] = useState<{ date: string; referredBy: string; admittedByName: string } | null>(null)
  const [readmitting, setReadmitting] = useState(false)

  // Carga los datos una sola vez por paciente: la suscripción en vivo no debe
  // pisar lo que se está escribiendo.
  const loadedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!patient || loadedFor.current === patient.id) return
    loadedFor.current = patient.id
    setForm(toForm(patient))
  }, [patient])

  const missing = useMemo(() => (patient && form ? admissionMissingFields({ ...patient, ...form }) : []), [patient, form])

  if (!patient || !form) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {loading || (patient && !form) ? 'Cargando admisión…' : 'Paciente no encontrado.'}
      </div>
    )
  }

  function setField(key: TextKey, value: string) {
    setForm((f) => {
      if (!f) return f
      const next = { ...f, [key]: value }
      if (key === 'firstName' || key === 'middleName' || key === 'fatherSurname' || key === 'motherSurname') {
        const composed = composeName(next)
        if (composed) next.name = composed
      }
      return next
    })
  }

  function setContact(key: keyof EmergencyContact, value: string) {
    setForm((f) => (f ? { ...f, emergencyContact: { ...f.emergencyContact, [key]: value } } : f))
  }

  const text = (key: TextKey, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      value={form[key]}
      onChange={(e) => setField(key, e.target.value)}
      disabled={!canEdit}
      className="form-input disabled:text-slate-500"
      {...props}
    />
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!patient || !form) return
    setError(null)
    const payload: Partial<PatientInput> = {
      ...form,
      name: form.name.trim() || patient.name,
      age: form.birthDate ? ageFromBirthDate(form.birthDate) : patient.age,
    }
    const validationError = validatePatientInput({ ...patient, ...payload } as PatientInput)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    try {
      await update(patient.id, payload)
      toast.success('Admisión guardada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la admisión.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReadmit() {
    if (!patient || !readmit) return
    if (!readmit.date) {
      toast.error('Indique la fecha del reingreso.')
      return
    }
    if (openAdmission && patient.status !== 'Alta' && patient.status !== 'Inactivo') {
      const ok = await confirm({
        title: 'Internamiento sin egreso',
        message: `La admisión del ${openAdmission.date} no tiene egreso registrado. Lo normal es registrar primero la epicrisis (MSP 006). ¿Registrar el reingreso de todas formas?`,
      })
      if (!ok) return
    }
    setReadmitting(true)
    try {
      await addReadmission({ ...readmit, admittedByName: readmit.admittedByName.trim() || userName })
      toast.success('Reingreso registrado.')
      setReadmit(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el reingreso.')
    } finally {
      setReadmitting(false)
    }
  }

  async function handleRemove(admission: Admission) {
    const ok = await confirm({
      title: 'Eliminar admisión',
      message: `¿Eliminar la admisión del ${admission.date}? La historia clínica y el registro de cambios no se modifican.`,
    })
    if (!ok) return
    try {
      await removeAdmission(admission)
      toast.success('Admisión eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la admisión.')
    }
  }

  const backPath = can('patients', 'viewDetail') ? `/patients/${patient.id}` : '/patients'
  const cell = 'px-3 py-2.5'

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(backPath)} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver al paciente
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admisión — {patient.name}</h2>
          <p className="text-slate-500">Formulario MSP 001 · N° HC {hcNumber(patient, record) || '—'}</p>
        </div>
        <a
          href={`#/print/msp001/${patient.id}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary inline-flex items-center self-start sm:self-auto"
        >
          🖨️ Imprimir MSP 001
        </a>
      </div>

      {missing.length > 0 ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-bold">Faltan {missing.length} datos para completar la admisión</p>
          <p className="mt-1">{missing.join(' · ')}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✅ Admisión completa.
        </div>
      )}

      <form onSubmit={handleSave}>
        <Card title="1. Registro de primera admisión" subtitle={`Primera admisión: ${admissions[0]?.date ?? patient.admission}`}>
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-6">
            <Group title="Identificación">
              <Field label="Apellido paterno">{text('fatherSurname')}</Field>
              <Field label="Apellido materno">{text('motherSurname')}</Field>
              <Field label="Primer nombre">{text('firstName')}</Field>
              <Field label="Segundo nombre">{text('middleName')}</Field>
              <Field label="Nombre para mostrar" span={2}>
                {text('name', { required: true })}
                <p className="mt-1 text-xs text-slate-400">Se arma solo al llenar nombres y apellidos.</p>
              </Field>
              <Field label="Cédula">{text('idCard', { inputMode: 'numeric' })}</Field>
              <Field label="Sexo">
                <select
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value as PatientSex })}
                  disabled={!canEdit}
                  className="form-input"
                >
                  <option value="">Sin registrar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </Field>
            </Group>

            <Group title="Nacimiento y datos personales">
              <Field label="Fecha de nacimiento">{text('birthDate', { type: 'date' })}</Field>
              <Field label="Lugar de nacimiento">{text('birthPlace', { placeholder: 'Ciudad / cantón' })}</Field>
              <Field label="Nacionalidad">{text('nationality', { placeholder: 'Ecuatoriana' })}</Field>
              <Field label="Grupo cultural">{text('culturalGroup', { list: 'admission-cultural' })}</Field>
              <Field label="Estado civil">{text('maritalStatus', { list: 'admission-marital' })}</Field>
              <Field label="Instrucción (último año aprobado)">{text('education')}</Field>
              <Field label="Ocupación">{text('occupation')}</Field>
              <Field label="Empresa donde trabaja">{text('employer')}</Field>
            </Group>

            <Group title="Residencia habitual">
              <Field label="Dirección (calle, N°, manzana y casa)" span={2}>
                {text('address')}
              </Field>
              <Field label="Barrio">{text('neighborhood')}</Field>
              <Field label="Zona">
                <select
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value as PatientZone })}
                  disabled={!canEdit}
                  className="form-input"
                >
                  <option value="">Sin registrar</option>
                  <option value="U">Urbana</option>
                  <option value="R">Rural</option>
                </select>
              </Field>
              <Field label="Parroquia">{text('parish')}</Field>
              <Field label="Cantón">{text('canton')}</Field>
              <Field label="Provincia">{text('province')}</Field>
              <Field label="Teléfono">{text('phone', { type: 'tel' })}</Field>
            </Group>

            <Group title="Admisión">
              <Field label="Referido de" span={2}>
                {text('referredBy', { placeholder: 'Familia, hospital, fiscalía, iniciativa propia…' })}
              </Field>
              <Field label="Tipo de seguro de salud">{text('insurance', { list: 'admission-insurance' })}</Field>
              <Field label="Admisionista">{text('admittedByName', { placeholder: userName })}</Field>
            </Group>

            <Group title="Contacto de emergencia">
              {(
                [
                  ['name', 'En caso necesario llamar a'],
                  ['relationship', 'Parentesco - afinidad'],
                  ['phone', 'Teléfono'],
                  ['address', 'Dirección'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    value={form.emergencyContact[key]}
                    onChange={(e) => setContact(key, e.target.value)}
                    disabled={!canEdit}
                    className="form-input disabled:text-slate-500"
                  />
                </Field>
              ))}
            </Group>

            <div>
              <label className="form-label">Información adicional</label>
              <textarea
                value={form.additionalInfo}
                onChange={(e) => setField('additionalInfo', e.target.value)}
                disabled={!canEdit}
                className="form-textarea"
              />
            </div>
          </div>

          <datalist id="admission-cultural">
            {CULTURAL_GROUPS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <datalist id="admission-marital">
            {MARITAL_STATUS_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <datalist id="admission-insurance">
            {INSURANCE_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>

          {canEdit && (
            <div className="mt-6">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando…' : 'Guardar admisión'}
              </button>
            </div>
          )}
        </Card>
      </form>

      <Card
        title="2. Admisiones y reingresos"
        subtitle="Cada internamiento del usuario. El egreso lo registra la epicrisis (MSP 006) al dar el alta."
        action={
          canEdit &&
          !readmit && (
            <button
              type="button"
              onClick={() => setReadmit({ date: todayISO(), referredBy: '', admittedByName: userName })}
              className="btn-secondary text-sm self-start"
            >
              + Registrar reingreso
            </button>
          )
        }
      >
        {readmit && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-[170px_1fr_1fr_auto] gap-3 items-end rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <Field label="Fecha de reingreso">
              <input
                type="date"
                value={readmit.date}
                onChange={(e) => setReadmit({ ...readmit, date: e.target.value })}
                className="form-input"
              />
            </Field>
            <Field label="Referido de">
              <input
                value={readmit.referredBy}
                onChange={(e) => setReadmit({ ...readmit, referredBy: e.target.value })}
                className="form-input"
              />
            </Field>
            <Field label="Admisionista">
              <input
                value={readmit.admittedByName}
                onChange={(e) => setReadmit({ ...readmit, admittedByName: e.target.value })}
                className="form-input"
              />
            </Field>
            <div className="flex gap-2">
              <button type="button" onClick={handleReadmit} disabled={readmitting} className="btn-primary">
                {readmitting ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setReadmit(null)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className={cell}>N°</th>
                <th className={cell}>Fecha</th>
                <th className={cell}>Tipo</th>
                <th className={cell}>Edad</th>
                <th className={cell}>Referido de</th>
                <th className={cell}>Admisionista</th>
                <th className={cell}>Egreso</th>
                <th className={cell} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {admissions.map((a, i) => (
                <tr key={a.id} className="table-row">
                  <td className={`${cell} text-slate-400`}>{i + 1}</td>
                  <td className={`${cell} whitespace-nowrap`}>{a.date}</td>
                  <td className={cell}>
                    <span className={`status-badge ${a.kind === 'Primera' ? 'status-activo' : 'status-nuevo'}`}>{a.kind}</span>
                  </td>
                  <td className={cell}>{a.age ?? '—'}</td>
                  <td className={cell}>{a.referredBy || '—'}</td>
                  <td className={cell}>{a.admittedByName || '—'}</td>
                  <td className={cell}>
                    {a.dischargeDate ? (
                      <span>
                        {a.dischargeDate}
                        <span className="block text-xs text-slate-400">{a.dischargeType ?? ''}</span>
                      </span>
                    ) : (
                      <span className="status-badge status-pendiente">Internamiento abierto</span>
                    )}
                  </td>
                  <td className={cell}>
                    {can('patients', 'delete') && a.id !== 'ficha' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                        title="Eliminar admisión"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-sm text-slate-400">
                    Sin admisiones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openAdmission && record && can('records', 'create') && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>Internamiento abierto desde el {openAdmission.date}.</span>
            <button
              type="button"
              onClick={() => navigate(`/records/${record.id}/entry?form=006`)}
              className="btn-secondary text-xs"
            >
              🏁 Registrar egreso con epicrisis
            </button>
          </div>
        )}
      </Card>

      <Card
        title="3. Registro de cambios"
        subtitle="Se registra solo al modificar estado civil, instrucción, ocupación, empresa, seguro, dirección o teléfono."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className={cell}>Fecha</th>
                <th className={cell}>Qué cambió</th>
                <th className={cell}>Estado civil</th>
                <th className={cell}>Instrucción</th>
                <th className={cell}>Ocupación / empresa</th>
                <th className={cell}>Seguro</th>
                <th className={cell}>Dirección</th>
                <th className={cell}>Teléfono</th>
                <th className={cell}>Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {changes.map((c) => (
                <tr key={c.id} className="table-row align-top">
                  <td className={`${cell} whitespace-nowrap`}>{c.date}</td>
                  <td className={`${cell} text-xs font-semibold text-amber-700`}>
                    {(c.changedFields ?? []).map((f) => CHANGE_LABELS[f]).join(', ')}
                  </td>
                  <td className={cell}>{c.maritalStatus || '—'}</td>
                  <td className={cell}>{c.education || '—'}</td>
                  <td className={cell}>{[c.occupation, c.employer].filter(Boolean).join(' · ') || '—'}</td>
                  <td className={cell}>{c.insurance || '—'}</td>
                  <td className={cell}>
                    {[c.address, c.neighborhood, c.parish, c.canton, c.province].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className={cell}>{c.phone || '—'}</td>
                  <td className={`${cell} text-xs text-slate-500`}>{c.changedByName ?? '—'}</td>
                </tr>
              ))}
              {changes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-6 text-center text-sm text-slate-400">
                    Sin cambios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
