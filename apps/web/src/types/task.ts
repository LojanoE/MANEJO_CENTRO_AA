export type TaskCategory =
  | 'Limpieza'
  | 'Mantenimiento'
  | 'Terapia'
  | 'Administración'
  | 'Compras'
  | 'Reunión'
  | 'Otro'

export type TaskPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente'
export type TaskStatus = 'Pendiente' | 'En progreso' | 'Hecha' | 'Cancelada'

export interface Recurring {
  type: 'Única' | 'Diaria' | 'Semanal' | 'Mensual'
  interval?: number
}

export interface Task {
  id: string
  title: string
  description?: string
  category: TaskCategory
  assignedToId?: string | null
  assignedToName?: string | null
  patientId?: string | null
  patientName?: string | null
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  completedAt?: string | null
  completedById?: string | null
  recurring: Recurring
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewTask = Omit<Task, 'id'>
export type TaskInput = Omit<NewTask, 'assignedToName' | 'patientName' | 'completedAt' | 'completedById' | 'createdAt' | 'updatedAt'>