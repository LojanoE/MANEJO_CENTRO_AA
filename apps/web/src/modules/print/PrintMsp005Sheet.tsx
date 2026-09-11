import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { compareEntriesAsc } from '../../utils/mspEntry'
import Msp005Sheet from './forms/Msp005Sheet'

/**
 * Hoja continua MSP 005 de un paciente: todas sus evoluciones en orden
 * cronológico, como la hoja en papel que se va llenando durante el
 * internamiento. Deja filas vacías al final para anotaciones a mano.
 */
export default function PrintMsp005Sheet() {
  const { recordId } = useParams<{ recordId: string }>()
  const { records, loading: recordsLoading } = useRecords()
  const { entries, loading: entriesLoading } = useRecordEntries(recordId)
  const { patients } = usePatients()
  const { professionals } = useProfessionals()
  const { settings } = useSettingsLive()

  const record = records.find((r) => r.id === recordId)
  const patient = record ? patients.find((p) => p.id === record.patientId) : undefined
  const evoluciones = useMemo(() => entries.filter((e) => e.formType === '005').sort(compareEntriesAsc), [entries])

  if (!record) {
    return (
      <PrintLayout title="Evolución y prescripciones (MSP 005)">
        <p className="text-sm text-slate-500">{recordsLoading ? 'Cargando…' : 'Historia clínica no encontrada.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Evolución y prescripciones (MSP 005) — ${patient?.name ?? record.patientName}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando evoluciones…</p>
      ) : (
        <Msp005Sheet
          entries={evoluciones}
          patient={patient}
          record={record}
          professionals={professionals}
          centerName={settings.centerName}
          establishmentCode={settings.establishmentCode}
          blankRows={evoluciones.length === 0 ? 8 : 2}
        />
      )}
    </PrintLayout>
  )
}
