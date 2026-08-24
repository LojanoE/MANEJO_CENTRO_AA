import type { ChecklistItemInput, WeekdayKey } from '../types/checklist'
import { WEEKDAYS } from '../types/checklist'

/**
 * Plantilla inicial del checklist semanal, transcrita del Excel
 * "Checklist_Semanal_CETAD_Alma_y_Vida.xlsx" (celdas `☐` = aplica, `—` = no aplica).
 *
 * Solo se usa para el sembrado inicial desde la UI. Una vez sembrada, la fuente de
 * verdad es la colección `checklistItems` en Firestore, editable por admin y
 * administrativo.
 */

const TODOS: WeekdayKey[] = WEEKDAYS
const LUN_VIE: WeekdayKey[] = ['lun', 'mar', 'mie', 'jue', 'vie']

export const CHECKLIST_TEMPLATE: ChecklistItemInput[] = [
  // ---- Checklist de Actividades ----
  {
    section: 'Actividades',
    label: 'Desayuno',
    startTime: '07:00',
    endTime: '08:00',
    responsible: null,
    days: TODOS,
    order: 1,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Solo por Hoy',
    startTime: '08:00',
    endTime: '09:00',
    responsible: null,
    days: TODOS,
    order: 2,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Terapia',
    startTime: '09:00',
    endTime: '11:00',
    responsible: 'Marco Ramírez',
    days: LUN_VIE,
    order: 3,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Deportes',
    startTime: '09:00',
    endTime: '11:00',
    responsible: 'Marco Ramírez',
    days: ['sab'],
    order: 4,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Terapia psicológica',
    startTime: '11:00',
    endTime: '13:00',
    responsible: 'Kelly/Andrea',
    days: ['lun', 'mar', 'mie', 'vie'],
    order: 5,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Día de Adoración',
    startTime: '11:00',
    endTime: '13:00',
    responsible: 'Hermanas',
    days: ['jue'],
    order: 6,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Terapia (mañana)',
    startTime: '09:00',
    endTime: '13:00',
    responsible: 'Ashly Bravo',
    days: ['dom'],
    order: 7,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Almuerzo',
    startTime: '13:00',
    endTime: '14:00',
    responsible: null,
    days: TODOS,
    order: 8,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Terapia (tarde)',
    startTime: '15:00',
    endTime: '18:00',
    responsible: 'Ashly Bravo',
    days: LUN_VIE,
    order: 9,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Danza',
    startTime: '18:00',
    endTime: '19:00',
    responsible: null,
    days: ['lun', 'mie', 'vie'],
    order: 10,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Cena',
    startTime: null,
    endTime: null,
    responsible: null,
    days: TODOS,
    order: 11,
    active: true,
  },
  {
    section: 'Actividades',
    label: 'Hora de dormir',
    startTime: '21:00',
    endTime: null,
    responsible: null,
    days: TODOS,
    order: 12,
    active: true,
  },

  // ---- Checklist de Limpieza (todas las áreas, lunes a domingo) ----
  ...['Baños', 'Cocina', 'Sala de comedor', 'Habitaciones administrativas', 'Sala de espera'].map(
    (label, i): ChecklistItemInput => ({
      section: 'Limpieza',
      label,
      startTime: null,
      endTime: null,
      responsible: null,
      days: TODOS,
      order: i + 1,
      active: true,
    }),
  ),
]
