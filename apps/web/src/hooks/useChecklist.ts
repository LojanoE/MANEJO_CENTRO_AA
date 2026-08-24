import { useCallback, useMemo } from 'react'
import { useCollection, byField } from './useCollection'
import {
  saveDoc,
  saveDocWithId,
  saveDocsBatch,
  updateDocHelper,
  removeDoc,
  logActivity,
} from '../firebase/firestore'
import { useAuthStore } from '../stores/authStore'
import { CHECKLIST_TEMPLATE } from '../config/checklistTemplate'
import { markId } from '../types/checklist'
import type {
  ChecklistItem,
  ChecklistItemInput,
  ChecklistMark,
  WeekdayKey,
} from '../types/checklist'

/**
 * Checklist semanal del centro.
 *
 * La plantilla (`checklistItems`) se carga entera — son ~17 filas, no vale la pena
 * paginar. Las marcas (`checklistMarks`) se filtran por la semana visible para no
 * traer todo el historial en cada render.
 *
 * A diferencia de `useTasks`, marcar una casilla NO escribe en `activityLog`: son
 * ~119 casillas por semana y ahogarían el feed del Dashboard. Solo se registran los
 * cambios de plantilla, que sí son excepcionales.
 */
export function useChecklist(weekId: string) {
  const { data: items, loading: loadingItems, error: itemsError } = useCollection<ChecklistItem>('checklistItems')
  const {
    data: marks,
    loading: loadingMarks,
    error: marksError,
  } = useCollection<ChecklistMark>('checklistMarks', byField('weekId', weekId))

  /** Marcas de la semana indexadas por id, para consultar cada celda en O(1). */
  const marksById = useMemo(() => {
    const map = new Map<string, ChecklistMark>()
    marks.forEach((m) => map.set(m.id, m))
    return map
  }, [marks])

  /** Filas activas, ordenadas por `order` dentro de cada sección. */
  const sortedItems = useMemo(
    () => items.filter((i) => i.active).sort((a, b) => a.order - b.order),
    [items],
  )

  const toggleMark = useCallback(
    async (item: ChecklistItem, day: WeekdayKey, date: string) => {
      const id = markId(weekId, item.id, day)
      if (marksById.has(id)) {
        await removeDoc('checklistMarks', id)
        return
      }
      const user = useAuthStore.getState().user
      await saveDocWithId('checklistMarks', id, {
        weekId,
        itemId: item.id,
        day,
        date,
        byId: user?.uid ?? null,
        byName: user?.name ?? null,
        at: new Date().toISOString(),
      })
    },
    [weekId, marksById],
  )

  const createItem = useCallback(async (input: ChecklistItemInput) => {
    const id = await saveDoc('checklistItems', input)
    await logActivity({
      type: 'new_task',
      message: `Checklist: nueva fila "${input.label}"`,
      submessage: input.section,
      refId: id,
      color: 'bg-emerald-500',
      icon: '🗓️',
    })
    return id
  }, [])

  const updateItem = useCallback(async (id: string, patch: Partial<ChecklistItemInput>) => {
    await updateDocHelper('checklistItems', id, patch)
  }, [])

  const removeItem = useCallback(async (item: ChecklistItem) => {
    await removeDoc('checklistItems', item.id)
    await logActivity({
      type: 'new_task',
      message: `Checklist: fila eliminada "${item.label}"`,
      submessage: item.section,
      refId: item.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  /** Carga la plantilla del Excel. Solo tiene sentido con la colección vacía. */
  const seedTemplate = useCallback(async () => {
    const ids = await saveDocsBatch('checklistItems', CHECKLIST_TEMPLATE)
    await logActivity({
      type: 'new_task',
      message: 'Checklist: plantilla inicial cargada',
      submessage: `${ids.length} filas`,
      color: 'bg-emerald-500',
      icon: '🗓️',
    })
    return ids
  }, [])

  return {
    items: sortedItems,
    allItems: items,
    marks,
    marksById,
    loading: loadingItems || loadingMarks,
    error: itemsError ?? marksError,
    toggleMark,
    createItem,
    updateItem,
    removeItem,
    seedTemplate,
  }
}
