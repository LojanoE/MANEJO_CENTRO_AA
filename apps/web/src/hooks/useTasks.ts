import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { usePatients } from './usePatients'
import { useAuthStore } from '../stores/authStore'
import type { Task, TaskInput, NewTask, TaskStatus, Recurring, TaskCategory, TaskPriority } from '../types/task'

function resolvePatientNameInto(
  patients: { id: string; name: string }[],
  patientId: string | null,
): string | null {
  if (!patientId) return null
  return patients.find((p) => p.id === patientId)?.name ?? null
}

/** Compute the next due date when completing a recurring task. */
export function nextDueDate(dueDate: string | null | undefined, recurring: Recurring): string | null {
  if (!dueDate) return null
  const base = new Date(dueDate)
  const interval = recurring.interval ?? 1
  const d = new Date(base)
  switch (recurring.type) {
    case 'Diaria':
      d.setDate(d.getDate() + interval)
      break
    case 'Semanal':
      d.setDate(d.getDate() + 7 * interval)
      break
    case 'Mensual':
      d.setMonth(d.getMonth() + interval)
      break
    case 'Única':
    default:
      return null
  }
  return d.toISOString().slice(0, 10)
}

export function useTasks() {
  const { data: tasks, loading, error } = useCollection<Task>('tasks')
  const { patients } = usePatients()
  const user = useAuthStore.getState().user

  const create = useCallback(
    async (input: TaskInput) => {
      const data: NewTask = {
        ...input,
        assignedToName: null,
        patientName: resolvePatientNameInto(patients, input.patientId ?? null),
        completedAt: null,
        completedById: null,
      }
      const id = await saveDoc('tasks', data)
      await logActivity({
        type: 'new_task',
        message: `Nueva tarea: ${input.title}`,
        submessage: `${input.category} · ${input.priority} · ${input.dueDate ?? 'sin fecha'}`,
        refId: id,
        color: 'bg-emerald-500',
        icon: '✅',
      })
      return id
    },
    [patients],
  )

  const update = useCallback(async (id: string, patch: Partial<TaskInput>) => {
    await updateDocHelper('tasks', id, patch)
  }, [])

  const setStatus = useCallback(
    async (t: Task, status: TaskStatus) => {
      if (status === 'Hecha') {
        const completedAt = new Date().toISOString()
        await updateDocHelper('tasks', t.id, {
          status,
          completedAt,
          completedById: user?.uid ?? null,
        })
        await logActivity({
          type: 'task_done',
          message: `Tarea completada: ${t.title}`,
          submessage: t.assignedToName ?? 'Sin asignar',
          refId: t.id,
          color: 'bg-emerald-500',
          icon: '✅',
        })
        // If recurring, clone the task with the next due date
        if (t.recurring && t.recurring.type !== 'Única') {
          const next = nextDueDate(t.dueDate, t.recurring)
          if (next) {
            const clone: NewTask = {
              title: t.title,
              description: t.description ?? '',
              category: t.category,
              assignedToId: t.assignedToId ?? null,
              assignedToName: t.assignedToName ?? null,
              patientId: t.patientId ?? null,
              patientName: t.patientName ?? null,
              dueDate: next,
              priority: t.priority,
              status: 'Pendiente',
              completedAt: null,
              completedById: null,
              recurring: t.recurring,
            }
            await saveDoc('tasks', clone)
          }
        }
      } else {
        await updateDocHelper('tasks', t.id, { status })
      }
    },
    [user?.uid],
  )

  const remove = useCallback(
    async (t: Task) => {
      await removeDoc('tasks', t.id)
      await logActivity({
        type: 'new_task',
        message: `Tarea eliminada: ${t.title}`,
        submessage: t.category,
        refId: t.id,
        color: 'bg-red-400',
        icon: '🗑️',
      })
    },
    [],
  )

  return { tasks, patients, loading, error, create, update, setStatus, remove }
}

export const TASK_CATEGORIES: TaskCategory[] = [
  'Limpieza',
  'Mantenimiento',
  'Terapia',
  'Administración',
  'Compras',
  'Reunión',
  'Otro',
]
export const TASK_PRIORITIES: TaskPriority[] = ['Baja', 'Media', 'Alta', 'Urgente']
export const TASK_STATUSES: TaskStatus[] = ['Pendiente', 'En progreso', 'Hecha', 'Cancelada']
export const RECURRING_TYPES: Recurring['type'][] = ['Única', 'Diaria', 'Semanal', 'Mensual']