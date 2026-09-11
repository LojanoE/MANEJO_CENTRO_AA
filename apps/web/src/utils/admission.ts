import type { Patient } from '../types/patient'

/** Opciones sugeridas (datalist) del MSP 001; se admite texto libre. */
export const CULTURAL_GROUPS = ['Mestizo', 'Indígena', 'Afroecuatoriano', 'Montubio', 'Blanco', 'Otro']
export const INSURANCE_OPTIONS = ['Ninguno', 'IESS', 'IESS - Seguro Campesino', 'ISSFA', 'ISSPOL', 'Seguro privado']
export const MARITAL_STATUS_OPTIONS = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión libre']

const trim = (v: string | undefined) => v?.trim() ?? ''

/** "Primer Segundo Paterno Materno"; '' mientras falte el primer nombre o el apellido paterno. */
export function composeName(p: Pick<Patient, 'firstName' | 'middleName' | 'fatherSurname' | 'motherSurname'>): string {
  if (!trim(p.firstName) || !trim(p.fatherSurname)) return ''
  return [p.firstName, p.middleName, p.fatherSurname, p.motherSurname].map(trim).filter(Boolean).join(' ')
}

/** "APELLIDOS NOMBRES" como se escribe en los formularios MSP; sin partes separadas, el nombre completo. */
export function surnamesFirst(p: Pick<Patient, 'name' | 'firstName' | 'middleName' | 'fatherSurname' | 'motherSurname'>): string {
  const surnames = [p.fatherSurname, p.motherSurname].map(trim).filter(Boolean).join(' ')
  const names = [p.firstName, p.middleName].map(trim).filter(Boolean).join(' ')
  return surnames && names ? `${surnames} ${names}` : p.name
}

/** Datos del MSP 001 que faltan, para el aviso de "admisión incompleta". */
export function admissionMissingFields(p: Patient): string[] {
  const checks: [string, boolean][] = [
    ['Apellidos y nombres separados', Boolean(trim(p.firstName) && trim(p.fatherSurname))],
    ['Cédula', Boolean(trim(p.idCard))],
    ['Sexo', Boolean(p.sex)],
    ['Fecha de nacimiento', Boolean(p.birthDate)],
    ['Lugar de nacimiento', Boolean(trim(p.birthPlace))],
    ['Nacionalidad', Boolean(trim(p.nationality))],
    ['Grupo cultural', Boolean(trim(p.culturalGroup))],
    ['Parroquia, cantón y provincia', Boolean(trim(p.parish) && trim(p.canton) && trim(p.province))],
    ['Tipo de seguro', Boolean(trim(p.insurance))],
    ['Contacto de emergencia', Boolean(trim(p.emergencyContact?.name) && trim(p.emergencyContact?.phone))],
  ]
  return checks.filter(([, ok]) => !ok).map(([label]) => label)
}
