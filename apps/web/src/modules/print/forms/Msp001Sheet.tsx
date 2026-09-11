import type { Admission, PatientChange } from '../../../types/admission'
import type { MedicalRecord } from '../../../types/medicalRecord'
import type { Patient } from '../../../types/patient'
import { MSP_SHEET_CODES } from '../../../config/printableForms'
import { clean, hcNumber, sexLabel } from '../../../utils/clinicalPrint'
import { CellGrid, Mark, Section, SheetTitle, TextBody } from './primitives'

interface Props {
  /** Sin paciente = formulario en blanco. */
  patient?: Patient | null
  record?: MedicalRecord | null
  admissions?: Admission[]
  changes?: PatientChange[]
  centerName: string
  establishmentCode?: string
}

const td = 'border border-slate-400 px-1 py-0.5 align-top'
const th = `${td} bg-slate-50 text-left text-[7px] font-bold uppercase leading-tight text-slate-600`
const ZONE_LABELS = { U: 'Urbana', R: 'Rural' } as const

function fillRows<T>(items: T[], min: number): (T | null)[] {
  return [...items, ...Array<null>(Math.max(0, min - items.length)).fill(null)]
}

/**
 * Formulario MSP 001 Admisión: datos de la primera admisión, registro de
 * reingresos, registro de cambios (automático) e información adicional.
 */
export default function Msp001Sheet({ patient: p, record, admissions = [], changes = [], centerName, establishmentCode }: Props) {
  const hasNameParts = Boolean(clean(p?.firstName) || clean(p?.fatherSurname))
  const contact = p?.emergencyContact
  const first = admissions[0]

  const nameItems =
    p && !hasNameParts
      ? [{ label: 'Apellidos y nombres (sin separar en la ficha)', value: p.name, span: 4 }]
      : [
          { label: 'Apellido paterno', value: clean(p?.fatherSurname) },
          { label: 'Apellido materno', value: clean(p?.motherSurname) },
          { label: 'Primer nombre', value: clean(p?.firstName) },
          { label: 'Segundo nombre', value: clean(p?.middleName) },
        ]

  return (
    <div className="space-y-1.5 text-slate-900">
      <SheetTitle title="Admisión" code={MSP_SHEET_CODES['001']} hc={hcNumber(p, record)} />

      <Section>
        <CellGrid
          cols={4}
          items={[
            { label: 'Institución del sistema / establecimiento', value: centerName, span: 2 },
            { label: 'Unidad operativa / código', value: establishmentCode ?? '' },
            { label: 'Fecha de primera admisión', value: first?.date ?? clean(p?.admission) },
          ]}
        />
      </Section>

      <Section letter="1" title="Registro de primera admisión">
        <CellGrid
          cols={4}
          items={[
            ...nameItems,
            { label: 'N° cédula de ciudadanía', value: clean(p?.idCard) },
            { label: 'Dirección de residencia habitual (calle, N°, manzana y casa)', value: clean(p?.address), span: 3 },
            { label: 'Barrio', value: clean(p?.neighborhood) },
            { label: 'Parroquia', value: clean(p?.parish) },
            { label: 'Cantón', value: clean(p?.canton) },
            { label: 'Provincia', value: clean(p?.province) },
            { label: 'Zona (U / R)', value: p?.zone ? ZONE_LABELS[p.zone] : '' },
            { label: 'N° teléfono', value: clean(p?.phone) },
            { label: 'Fecha de nacimiento', value: clean(p?.birthDate) },
            { label: 'Lugar de nacimiento', value: clean(p?.birthPlace) },
            { label: 'Nacionalidad (país)', value: clean(p?.nationality) },
            { label: 'Grupo cultural', value: clean(p?.culturalGroup) },
            { label: 'Edad (años cumplidos)', value: p?.age ? String(p.age) : '' },
            { label: 'Sexo', value: sexLabel(p?.sex) },
            { label: 'Estado civil', value: clean(p?.maritalStatus) },
            { label: 'Instrucción (último año aprobado)', value: clean(p?.education) },
            { label: 'Fecha de admisión', value: first?.date ?? clean(p?.admission) },
            { label: 'Ocupación', value: clean(p?.occupation) },
            { label: 'Empresa donde trabaja', value: clean(p?.employer) },
            { label: 'Tipo de seguro de salud', value: clean(p?.insurance) },
            { label: 'Referido de', value: clean(p?.referredBy), span: 2 },
            { label: 'En caso necesario llamar a', value: clean(contact?.name), span: 2 },
            { label: 'Parentesco - afinidad', value: clean(contact?.relationship) },
            { label: 'N° teléfono', value: clean(contact?.phone) },
            { label: 'Dirección del contacto', value: clean(contact?.address), span: 3 },
            { label: 'Admisionista', value: clean(p?.admittedByName) || clean(first?.admittedByName) },
          ]}
        />
      </Section>

      <Section letter="2" title="Registro de nuevas admisiones para atenciones de primera vez y subsecuentes">
        <table className="w-full table-fixed border-collapse border-hidden text-[9px]">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '7%' }} />
            <col />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '19%' }} />
          </colgroup>
          <thead>
            <tr>
              {['N°', 'Fecha', 'Edad', 'Referido de', 'Primera', 'Subsecuente', 'Admisionista', 'Egreso'].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fillRows(admissions, p ? 6 : 10).map((a, i) => (
              <tr key={a?.id ?? `blank-${i}`} className="h-5">
                <td className={`${td} text-slate-500`}>{i + 1}</td>
                <td className={td}>{a?.date ?? ''}</td>
                <td className={td}>{a?.age ?? ''}</td>
                <td className={td}>{a?.referredBy ?? ''}</td>
                <td className={`${td} text-center`}>
                  <Mark checked={a?.kind === 'Primera'} />
                </td>
                <td className={`${td} text-center`}>
                  <Mark checked={a?.kind === 'Subsecuente'} />
                </td>
                <td className={td}>{a?.admittedByName ?? ''}</td>
                <td className={td}>
                  {a?.dischargeDate ? `${a.dischargeDate}${a.dischargeType ? ` · ${a.dischargeType}` : ''}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section letter="3" title="Registro de cambios">
        <table className="w-full table-fixed border-collapse border-hidden text-[9px]">
          <colgroup>
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              {['Fecha', 'Estado civil', 'Instrucción', 'Ocupación', 'Empresa', 'Tipo de seguro', 'Dirección · barrio · parroquia · cantón · provincia', 'Teléfono'].map(
                (h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {fillRows(changes, p ? 3 : 4).map((c, i) => (
              <tr key={c?.id ?? `blank-${i}`} className="h-6">
                <td className={td}>{c?.date ?? ''}</td>
                <td className={td}>{c?.maritalStatus ?? ''}</td>
                <td className={td}>{c?.education ?? ''}</td>
                <td className={td}>{c?.occupation ?? ''}</td>
                <td className={td}>{c?.employer ?? ''}</td>
                <td className={td}>{c?.insurance ?? ''}</td>
                <td className={td}>
                  {c ? [c.address, c.neighborhood, c.parish, c.canton, c.province].filter(Boolean).join(' · ') : ''}
                </td>
                <td className={td}>{c?.phone ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section
        letter="4"
        title="Información adicional"
        hint="Otros datos específicos del usuario requeridos por la institución"
      >
        <TextBody blank={!p} value={clean(p?.additionalInfo)} lines={3} />
      </Section>
    </div>
  )
}
