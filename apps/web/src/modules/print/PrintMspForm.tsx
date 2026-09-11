import { useParams } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { entryDisplaySections, entryFormLabel } from '../../utils/mspEntry'
import { findProfessional, hcNumber } from '../../utils/clinicalPrint'
import Msp002Sheet from './forms/Msp002Sheet'
import Msp005Sheet from './forms/Msp005Sheet'
import Msp006Sheet from './forms/Msp006Sheet'
import { Section, SheetTitle, TextBody } from './forms/primitives'

/**
 * Impresión de UNA entrada clínica con el diseño del formulario oficial MSP:
 * 002 con sus secciones A–K, 005 como una fila de la hoja de evolución.
 * Para la hoja 005 completa de un paciente ver PrintMsp005Sheet.
 * Abrir en pestaña nueva y "Guardar como PDF" desde el diálogo de impresión.
 */
export default function PrintMspForm() {
  const { recordId, entryId } = useParams<{ recordId: string; entryId: string }>()
  const { records, loading: recordsLoading } = useRecords()
  const { entries, loading: entriesLoading } = useRecordEntries(recordId)
  const { patients } = usePatients()
  const { professionals } = useProfessionals()
  const { settings } = useSettingsLive()

  const record = records.find((r) => r.id === recordId)
  const entry = entries.find((e) => e.id === entryId)
  const patient = record ? patients.find((p) => p.id === record.patientId) : undefined

  if (!record || !entry) {
    return (
      <PrintLayout title="Formulario MSP">
        <p className="text-sm text-slate-500">{recordsLoading || entriesLoading ? 'Cargando…' : 'Registro no encontrado.'}</p>
      </PrintLayout>
    )
  }

  const professional = findProfessional(professionals, entry.authorId, entry.authorName ?? record.doctorName)
  const sheetProps = {
    patient,
    record,
    centerName: settings.centerName,
    establishmentCode: settings.establishmentCode,
  }

  return (
    <PrintLayout title={`${entryFormLabel(entry)} — ${patient?.name ?? record.patientName}`}>
      {entry.formType === '002' && <Msp002Sheet {...sheetProps} entry={entry} professional={professional} />}
      {entry.formType === '005' && <Msp005Sheet {...sheetProps} entries={[entry]} professionals={professionals} />}
      {entry.formType === '006' && <Msp006Sheet {...sheetProps} entry={entry} professional={professional} />}

      {/* Entrada clásica sin migrar: secciones genéricas */}
      {!entry.formType && (
        <div className="space-y-1.5">
          <SheetTitle title={`Registro clínico — ${entry.title}`} code="Formato clásico (sin migrar)" hc={hcNumber(patient, record)} />
          {entryDisplaySections(entry).map(({ label, value }) => (
            <Section key={label} title={label}>
              <TextBody value={value} />
            </Section>
          ))}
        </div>
      )}
    </PrintLayout>
  )
}
