import { useState, useRef, useCallback } from 'react'
import Modal from './Modal'
import { parsePatientExcel, type ParsedPatient } from '../../utils/patientImport'
import { saveDocsBatch, logActivity } from '../../firebase/firestore'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'

interface ExcelImportProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ExcelImport({ open, onClose, onSuccess }: ExcelImportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [preview, setPreview] = useState<ParsedPatient[]>([])
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError(null)
    setResult(null)
    setPreview([])
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parsePatientExcel(buffer)
      setPreview(parsed.slice(0, 10))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo')
    } finally {
      setParsing(false)
    }
  }, [])

  async function existingIds(cards: (string | undefined)[]): Promise<Set<string>> {
    const existing = new Set<string>()
    const validCards = cards.filter((c): c is string => !!c)
    if (validCards.length === 0) return existing

    // Firestore limita `in` a 10 elementos, procesamos en lotes.
    const chunkSize = 10
    for (let i = 0; i < validCards.length; i += chunkSize) {
      const chunk = validCards.slice(i, i + chunkSize)
      const q = query(collection(db, 'patients'), where('idCard', 'in', chunk))
      const snap = await getDocs(q)
      snap.docs.forEach((d) => {
        const data = d.data()
        if (data.idCard) existing.add(data.idCard as string)
      })
    }
    return existing
  }

  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      const file = inputRef.current?.files?.[0]
      if (!file) throw new Error('No hay archivo seleccionado')

      const buffer = await file.arrayBuffer()
      const all = parsePatientExcel(buffer)

      let toImport = all
      let skipped = 0

      if (skipDuplicates) {
        const existing = await existingIds(all.map((p) => p.data.idCard))
        toImport = all.filter((p) => {
          if (p.data.idCard && existing.has(p.data.idCard)) {
            skipped++
            return false
          }
          return true
        })
      }

      const errors: string[] = []
      let imported = 0

      try {
        await saveDocsBatch('patients', toImport.map((p) => p.data))
        imported = toImport.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        errors.push(`No se pudo completar la importación: ${msg}`)
      }

      await logActivity({
        type: 'patients_imported',
        message: 'Pacientes importados desde Excel',
        submessage: `${imported} importados · ${skipped} omitidos · ${errors.length} errores`,
        color: 'bg-emerald-500',
        icon: '📥',
      })

      setResult({ imported, skipped, errors })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  function close() {
    setPreview([])
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onClose()
  }

  return (
    <Modal open={open} title="Importar pacientes desde Excel" onClose={close} size="xl">
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm ${result.errors.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <p className="font-semibold">
              {result.imported} importados · {result.skipped} omitidos · {result.errors.length} errores
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-auto text-xs list-disc list-inside">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <label className="form-label">Archivo Excel</label>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={parsing || importing}
            className="form-input"
          />
          <p className="mt-1 text-xs text-slate-500">
            El archivo debe tener la estructura de "MATRIZ DE DATOS - PACIENTES CETAD AV actual.xlsx"
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="skip-duplicates"
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          <label htmlFor="skip-duplicates" className="text-sm text-slate-700">
            Omitir pacientes con cédula duplicada
          </label>
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Vista previa ({preview.length} de los registros detectados)
            </p>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Ingreso</th>
                    <th className="px-3 py-2 text-left">Cédula</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((p, idx) => (
                    <tr key={idx} className={p.errors.length > 0 ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2">{p.data.name}</td>
                      <td className="px-3 py-2">{p.data.admission}</td>
                      <td className="px-3 py-2">{p.data.idCard ?? '—'}</td>
                      <td className="px-3 py-2">{p.data.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" onClick={close} className="btn-secondary w-full sm:w-auto">
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={preview.length === 0 || importing || parsing}
            className="btn-primary w-full sm:w-auto"
          >
            {importing ? 'Importando…' : `Importar ${preview.length > 0 ? 'pacientes' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
