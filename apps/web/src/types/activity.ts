import type { Task } from './task'

export interface ActivityEntry {
  id: string
  type:
    | 'new_patient'
    | 'new_payment'
    | 'visit_pending'
    | 'visit_approved'
    | 'visit_denied'
    | 'auth_issued'
    | 'new_user'
    | 'new_task'
    | 'task_done'
    | 'new_record'
    | 'new_expense'
  message: string
  submessage?: string | null
  userId?: string | null
  userName?: string | null
  refId?: string | null
  color?: string
  icon?: string
  timestamp: unknown
}

export interface DashboardStats {
  activePatients: number
  monthlyRevenue: number
  todayVisits: number
  yearlyDischarges: number
  pendingPayments: number
  openTasks: number
  taskOverdue: number
}

export interface SeededTask extends Task {}