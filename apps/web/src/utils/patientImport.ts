import * as XLSX from 'xlsx'
import type { PatientInput, PatientStatus } from '../types/patient'

export interface ParsedPatient {
  rowIndex: number
  data: PatientInput
  raw: Record<string, unknown>
  errors: string[]
}

function toISOString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const y = date.y
      const m = String(date.m).padStart(2, '0')
      const d = String(date.d).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  const str = String(value).trim()
  if (!str) return null
  // Intentar parsear fecha tipo "2025-12-12 00:00:00"
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return null
}

function toString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

function normalizeStatus(value: unknown): PatientStatus {
  const str = toString(value).toUpperCase()
  if (str.includes('EGRES')) return 'Alta'
  if (str.includes('INTERNO')) return 'Activo'
  return 'Nuevo'
}

function normalizeName(value: unknown): string {
  return toString(value)
    .replace(/\s+/g, ' ')
    .trim()
}

export function parsePatientExcel(file: ArrayBuffer): ParsedPatient[] {
  const workbook = XLSX.read(file, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

  const results: ParsedPatient[] = []

  // Find the header row automatically; it must contain 'NOMBRE COMPLETO' in column C (index 2).
  let headerIndex = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const cell = toString(row[2]).toUpperCase()
    if (cell.includes('NOMBRE') && cell.includes('COMPLETO')) {
      headerIndex = i
      break
    }
  }

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 3

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue

    const name = normalizeName(row[2])
    if (!name) continue

    const admission = toISOString(row[4])
    const idCard = toString(row[5])
    const birthDate = toISOString(row[7])
    const age = toNumber(row[8]) ?? 0
    const address = toString(row[9])
    const maritalStatus = toString(row[10])
    const religion = toString(row[11])
    const phone = toString(row[12])
    const occupation = toString(row[13])
    const education = toString(row[14])
    const status = normalizeStatus(row[21])

    const errors: string[] = []
    if (!admission) errors.push('Fecha de ingreso no válida')

    const data: PatientInput = {
      name,
      admission: admission ?? new Date().toISOString().slice(0, 10),
      idCard: idCard || undefined,
      birthDate: birthDate || undefined,
      age,
      address: address || undefined,
      maritalStatus: maritalStatus || undefined,
      religion: religion || undefined,
      phone: phone || '',
      occupation: occupation || undefined,
      education: education || undefined,
      status,
      stage: 'Fase 1',
      monthlyFee: 150,
      nextPaymentDate: '',
      sponsor: '',
      assignedDoctorId: null,
    }

    results.push({
      rowIndex: i + 1,
      data,
      raw: {
        nombre: row[2],
        ingreso: row[4],
        cedula: row[5],
        nacimiento: row[7],
        edad: row[8],
        direccion: row[9],
        estadoCivil: row[10],
        religion: row[11],
        telefono: row[12],
        ocupacion: row[13],
        instruccion: row[14],
        estado: row[21],
      },
      errors,
    })
  }

  return results
}
