import type { FormArea, FormTemplate } from './formTemplates/types'
import type { Action, ModuleId } from './permissions'
import { PSICO_ENTREVISTA, PSICO_EVOLUCION, PSICO_HISTORIA } from './formTemplates/psicologia'
import { OCUPACIONAL, SOCIAL_SEGUIMIENTO, SOCIAL_SOCIOECONOMICA } from './formTemplates/social'

/**
 * Catálogo único de los formatos del expediente, ordenado por el flujo del
 * usuario en el centro (ingreso → evaluación → internamiento → alta → seguimiento).
 *
 * `digital: true` = se registra en el sistema y se imprime con los datos;
 * `false` = por ahora solo impresión pre-llenada, se digitaliza en `phase`.
 */

export type FlowStepId = 'ingreso' | 'evaluacion' | 'internamiento' | 'alta' | 'seguimiento'

export const FLOW_STEPS: { id: FlowStepId; title: string; description: string }[] = [
  { id: 'ingreso', title: 'Ingreso', description: 'Registro del usuario al llegar al centro.' },
  { id: 'evaluacion', title: 'Evaluación inicial', description: 'Primera semana: cada área evalúa al usuario.' },
  { id: 'internamiento', title: 'Durante el internamiento', description: 'Seguimiento continuo de cada área.' },
  { id: 'alta', title: 'Alta', description: 'Cierre clínico del internamiento.' },
  { id: 'seguimiento', title: 'Después del alta', description: 'Acompañamiento al usuario egresado y su familia.' },
]

export const AREA_LABELS: Record<FormArea, string> = {
  admision: 'Admisión',
  medica: 'Médica',
  psicologia: 'Psicología',
  social: 'Trabajo social',
  ocupacional: 'Ocupacional',
}

export interface PrintableForm {
  id: string
  title: string
  code?: string
  area: FormArea
  step: FlowStepId
  icon: string
  description: string
  digital: boolean
  /** Fase del plan en que el formato pasa a ser digital. */
  phase: number
  /** Pantalla donde se registra, si ya es digital y no depende del paciente. */
  digitalPath?: string
  /** Impresión con lo ya registrado del paciente, en lugar del formato pre-llenado. */
  filledPrintPath?: (patientId: string) => string
  /** Cómo registrar el formato para un paciente: permiso requerido y pantalla. */
  register?: {
    module: ModuleId
    action: Action
    label: string
    path: (ctx: { patientId: string; recordId?: string }) => string
  }
  /** Formato en papel cuyas preguntas se llenan dentro de otro formato digital. */
  integratedInto?: string
  /** Formato declarativo para la impresión pre-llenada (los digitales tienen su propia hoja). */
  template?: FormTemplate
}

export const PRINTABLE_FORMS: PrintableForm[] = [
  {
    id: 'msp-001',
    title: 'Admisión',
    code: 'MSP 001',
    area: 'admision',
    step: 'ingreso',
    icon: '🪪',
    description: 'Registro de primera admisión, reingresos y cambios de datos del usuario (automáticos).',
    digital: true,
    phase: 2,
    filledPrintPath: (patientId) => `#/print/msp001/${patientId}`,
    register: {
      module: 'patients',
      action: 'edit',
      label: 'Completar admisión',
      path: ({ patientId }) => `/patients/${patientId}/admision`,
    },
  },
  {
    id: 'msp-002',
    title: 'Historia clínica — consulta externa',
    code: 'MSP 002',
    area: 'medica',
    step: 'evaluacion',
    icon: '🩺',
    description: 'Motivo de consulta, antecedentes, constantes vitales, revisión de sistemas, examen físico y CIE-10.',
    digital: true,
    phase: 1,
    digitalPath: '/medical/formularios/002',
    register: {
      module: 'records',
      action: 'create',
      label: '+ Registrar',
      path: ({ patientId, recordId }) => (recordId ? `/records/${recordId}/entry?form=002` : `/records/new/${patientId}`),
    },
  },
  {
    id: 'psico-historia',
    title: 'Historia clínica psicológica',
    area: 'psicologia',
    step: 'evaluacion',
    icon: '🧠',
    description: 'Psicoanamnesis, consumo, familia, examen del estado mental, test y evaluación multiaxial. Integra la entrevista.',
    digital: true,
    phase: 3,
    template: PSICO_HISTORIA,
    digitalPath: '/psychology',
    filledPrintPath: (patientId) => `#/print/psico/historia/${patientId}`,
    register: {
      module: 'psychology',
      action: 'create',
      label: 'Abrir en Psicología',
      path: ({ patientId }) => `/psychology/${patientId}`,
    },
  },
  {
    id: 'psico-entrevista',
    title: 'Entrevista psicológica para adultos',
    area: 'psicologia',
    step: 'evaluacion',
    icon: '💬',
    description: 'Formato en papel: en el sistema sus preguntas se llenan dentro de la historia clínica psicológica.',
    digital: false,
    phase: 3,
    template: PSICO_ENTREVISTA,
    integratedInto: 'psico-historia',
  },
  {
    id: 'social-socioeconomica',
    title: 'Ficha socioeconómica',
    area: 'social',
    step: 'evaluacion',
    icon: '🏠',
    description: 'Composición familiar, situación económica, vivienda y compromisos del usuario.',
    digital: true,
    phase: 4,
    template: SOCIAL_SOCIOECONOMICA,
    digitalPath: '/social',
    filledPrintPath: (patientId) => `#/print/social/ficha/${patientId}`,
    register: {
      module: 'social',
      action: 'create',
      label: 'Abrir en Trabajo Social',
      path: ({ patientId }) => `/social/${patientId}`,
    },
  },
  {
    id: 'ocupacional',
    title: 'Área ocupacional',
    area: 'ocupacional',
    step: 'evaluacion',
    icon: '🧩',
    description: 'Evaluación por criterios (cumple / no cumple / no aplica) con observaciones.',
    digital: true,
    phase: 4,
    template: OCUPACIONAL,
    digitalPath: '/occupational',
    filledPrintPath: (patientId) => `#/print/occupational/${patientId}`,
    register: {
      module: 'occupational',
      action: 'create',
      label: 'Abrir en Ocupacional',
      path: ({ patientId }) => `/occupational/${patientId}`,
    },
  },
  {
    id: 'msp-005',
    title: 'Evolución y prescripciones',
    code: 'MSP 005',
    area: 'medica',
    step: 'internamiento',
    icon: '📋',
    description: 'Hoja continua con notas de evolución, farmacoterapia e indicaciones, y administración.',
    digital: true,
    phase: 1,
    digitalPath: '/medical/formularios/005',
    register: {
      module: 'records',
      action: 'create',
      label: '+ Registrar',
      path: ({ patientId, recordId }) => (recordId ? `/records/${recordId}/entry?form=005` : `/records/new/${patientId}`),
    },
  },
  {
    id: 'psico-evolucion',
    title: 'Hoja de evolución psicológica',
    area: 'psicologia',
    step: 'internamiento',
    icon: '📝',
    description: 'Una fila por sesión (individual, grupal o familiar): proceso terapéutico, observaciones y firma.',
    digital: true,
    phase: 3,
    template: PSICO_EVOLUCION,
    digitalPath: '/psychology',
    filledPrintPath: (patientId) => `#/print/psico/evolucion/${patientId}`,
    register: {
      module: 'psychology',
      action: 'create',
      label: '+ Sesión',
      path: ({ patientId }) => `/psychology/${patientId}?tab=sesiones`,
    },
  },
  {
    id: 'msp-006',
    title: 'Epicrisis',
    code: 'MSP 006',
    area: 'medica',
    step: 'alta',
    icon: '🏁',
    description: 'Se genera como borrador desde la historia clínica al dar el alta y cierra el internamiento.',
    digital: true,
    phase: 2,
    digitalPath: '/medical/formularios/006',
    register: {
      module: 'records',
      action: 'create',
      label: '+ Registrar',
      path: ({ patientId, recordId }) => (recordId ? `/records/${recordId}/entry?form=006` : `/records/new/${patientId}`),
    },
  },
  {
    id: 'social-seguimiento',
    title: 'Ficha de seguimiento social',
    area: 'social',
    step: 'seguimiento',
    icon: '🚪',
    description: 'Visita domiciliaria al usuario egresado: diagnóstico social, estable o recaída, fotos.',
    digital: true,
    phase: 4,
    template: SOCIAL_SEGUIMIENTO,
    digitalPath: '/social',
    filledPrintPath: (patientId) => `#/print/social/seguimiento/${patientId}`,
    register: {
      module: 'social',
      action: 'create',
      label: '+ Seguimiento',
      path: ({ patientId }) => `/social/${patientId}?tab=seguimientos`,
    },
  },
]

export function findPrintableForm(id: string | undefined): PrintableForm | undefined {
  return PRINTABLE_FORMS.find((f) => f.id === id)
}

/** Códigos oficiales de las hojas digitales (barra de título de la impresión). */
export const MSP_SHEET_CODES = {
  '001': 'SNS-MSP / HCU-form.001 / 2008',
  '002': 'SNS-MSP / HCU-form.002 / 2020',
  '005': 'SNS-MSP / HCU-form.005 / 2020',
  '006': 'SNS-MSP / HCU-form.006 / 2008',
} as const
