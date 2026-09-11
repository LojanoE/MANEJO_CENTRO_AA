import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { findPrintableForm } from '../../config/printableForms'
import { prefillValues } from '../../utils/clinicalPrint'
import Msp001Sheet from './forms/Msp001Sheet'
import Msp002Sheet from './forms/Msp002Sheet'
import Msp005Sheet from './forms/Msp005Sheet'
import Msp006Sheet from './forms/Msp006Sheet'
import BlankFormSheet from './forms/BlankFormSheet'

/**
 * Cualquier formato del expediente listo para llenar a mano: con los datos del
 * paciente si la ruta trae `:patientId`, o completamente en blanco si no.
 */
export default function PrintBlankForm() {
  const { formId, patientId } = useParams<{ formId: string; patientId?: string }>()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const { professionals } = useProfessionals()
  const { settings } = useSettingsLive()

  const form = findPrintableForm(formId)
  const patient = patientId ? patients.find((p) => p.id === patientId) : undefined
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined

  if (!form) {
    return (
      <PrintLayout title="Formato">
        <p className="text-sm text-slate-500">Formato no encontrado.</p>
      </PrintLayout>
    )
  }
  if (patientId && !patient) {
    return (
      <PrintLayout title={form.title}>
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  const sheetProps = {
    patient,
    record,
    centerName: settings.centerName,
    establishmentCode: settings.establishmentCode,
  }

  return (
    <PrintLayout title={patient ? `${form.title} — ${patient.name}` : `${form.title} (en blanco)`}>
      {form.id === 'msp-001' && <Msp001Sheet {...sheetProps} />}
      {form.id === 'msp-002' && <Msp002Sheet {...sheetProps} />}
      {form.id === 'msp-006' && <Msp006Sheet {...sheetProps} />}
      {form.id === 'msp-005' && <Msp005Sheet {...sheetProps} entries={[]} professionals={professionals} blankRows={9} />}
      {form.template && (
        <BlankFormSheet template={form.template} values={prefillValues({ patient, record, centerName: settings.centerName })} />
      )}
    </PrintLayout>
  )
}
