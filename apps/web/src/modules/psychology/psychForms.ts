import { PSICO_ENTREVISTA, PSICO_HISTORIA } from '../../config/formTemplates/psicologia'
import type { FormTemplate } from '../../config/formTemplates/types'
import type { PsychFormKind } from '../../types/psychology'

/**
 * Los dos formatos del centro que Psicología llena en el sistema, cada uno por
 * separado: la entrevista para adultos y la historia clínica psicológica.
 * Pestaña, formulario e impresión se arman desde aquí.
 */
export interface PsychFormConfig {
  template: FormTemplate
  /** Nombre corto para frases: "Nueva entrevista", "Eliminar la historia psicológica". */
  shortNoun: string
  previousTitle: string
  icon: string
  /** Segmento de ruta del formulario: /psychology/:patientId/<path>[/:entryId] (ver App.tsx). */
  path: string
  printPath: (patientId: string) => string
  emptyHint: string
  startLabel: string
  /** Formato del que se pueden traer respuestas ya registradas (utils/formAnswers → carryOverAnswers). */
  carryFrom?: PsychFormKind
  /** Campos del resumen en la pestaña (texto o lista para marcar). */
  highlights: { title: string; section: string; label?: string }[]
}

export const PSYCH_FORMS: Record<PsychFormKind, PsychFormConfig> = {
  entrevista: {
    template: PSICO_ENTREVISTA,
    shortNoun: 'entrevista',
    previousTitle: 'Entrevistas anteriores',
    icon: '💬',
    path: 'entrevista',
    printPath: (patientId) => `#/print/psico/entrevista/${patientId}`,
    emptyHint: 'Datos generales, antecedentes clínicos y psicológicos, e información familiar del usuario.',
    startLabel: 'Iniciar entrevista',
    // Las historias guardadas antes de separar los formatos traen estas preguntas.
    carryFrom: 'evaluacion',
    highlights: [
      { title: 'Ha presentado en su vida', section: 'II. Antecedentes clínicos y psicológicos', label: 'Marque con X si en su vida ha presentado' },
      { title: 'Relación con el padre', section: 'III. Información familiar', label: 'Tipo de relación que sostiene con su padre' },
      { title: 'Relación con la madre', section: 'III. Información familiar', label: 'Tipo de relación que sostiene con su madre' },
      { title: 'Qué opina de sus padres', section: 'III. Información familiar', label: '¿Qué opina de sus padres?' },
    ],
  },
  evaluacion: {
    template: PSICO_HISTORIA,
    shortNoun: 'historia psicológica',
    previousTitle: 'Historias anteriores',
    icon: '🧠',
    path: 'evaluacion',
    printPath: (patientId) => `#/print/psico/historia/${patientId}`,
    emptyHint: 'Motivo de consulta, historia de la enfermedad, psicoanamnesis, examen del estado mental, test, evaluación multiaxial y conclusiones.',
    startLabel: 'Iniciar evaluación psicológica',
    highlights: [
      { title: 'Motivo de consulta', section: 'Motivo de consulta', label: 'Motivo' },
      { title: 'Conclusiones', section: 'Conclusiones' },
      { title: 'Recomendaciones generales', section: 'Recomendaciones', label: 'Generales' },
      { title: 'Recomendaciones específicas', section: 'Recomendaciones', label: 'Específicas' },
    ],
  },
}
