import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useAuthStore } from '../../stores/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import PatientForm from './PatientForm'
import ExcelImport from '../../components/ui/ExcelImport'
import type { Patient, PatientInput } from '../../types/patient'

const STAGES = ['Todas las fases', 'Fase 1', 'Fase 2', 'Fase 3', 'Fase 4'] as const
const STATUSES = ['Todos los estados', 'Activo', 'Nuevo', 'Alta', 'Inactivo'] as const
const PAYMENT_STATUSES = ['Todos', 'Sin próximo pago', 'Al día', 'Vencido'] as const

type PaymentStatusLabel = (typeof PAYMENT_STATUSES)[number]

function getPaymentStatus(p: Patient): { label: PaymentStatusLabel; className: string } {
  if (!p.nextPaymentDate) return { label: 'Sin próximo pago', className: 'bg-slate-100 text-slate-500' }
  const today = new Date().toISOString().slice(0, 10)
  if (p.nextPaymentDate >= today) return { label: 'Al día', className: 'bg-emerald-100 text-emerald-700' }
  return { label: 'Vencido', className: 'bg-red-100 text-red-700' }
}

export default function Patients() {
  const { patients, loading, error, create, update, remove } = usePatients()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const isAdmin = user?.role === 'admin'
  const canViewDetail = isAdmin || user?.role === 'administrativo'

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('Todas las fases')
  const [statusFilter, setStatusFilter] = useState<string>('Todos los estados')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusLabel>('Todos')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
      const matchesStage = stageFilter === 'Todas las fases' || p.stage === stageFilter
      const matchesStatus = statusFilter === 'Todos los estados' || p.status === statusFilter
      const matchesPaymentStatus = paymentStatusFilter === 'Todos' || getPaymentStatus(p).label === paymentStatusFilter
      return matchesSearch && matchesStage && matchesStatus && matchesPaymentStatus
    })
  }, [patients, search, stageFilter, statusFilter, paymentStatusFilter])

  async function handleSubmit(input: PatientInput, id?: string) {
    if (input.idCard) {
      const duplicate = patients.find((p) => p.idCard === input.idCard && p.id !== id)
      if (duplicate) {
        throw new Error(`Ya existe un paciente con esa cédula: ${duplicate.name}.`)
      }
    }
    if (id) {
      await update(id, input)
      toast.success('Paciente actualizado.')
    } else {
      await create(input)
      toast.success('Paciente creado.')
    }
    setFormOpen(false)
    setEditing(null)
  }

  async function handleDelete(p: Patient) {
    const ok = await confirm({
      title: 'Eliminar paciente',
      message: `¿Eliminar a ${p.name}? Esta acción no se puede deshacer.`,
    })
    if (!ok) return
    try {
      await remove(p)
      toast.success('Paciente eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el paciente.')
    }
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(p: Patient) {
    setEditing(p)
    setFormOpen(true)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Pacientes</h2>
          <p className="text-slate-500">Registro y seguimiento de residentes del centro</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button onClick={() => setImportOpen(true)} className="btn-secondary">
              📥 Importar Excel
            </button>
          )}
          <button onClick={openNew} className="btn-primary">
            + Nuevo Paciente
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 px-4 lg:px-6 py-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nombre o teléfono..."
            className="form-input w-full sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full sm:w-auto"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="form-input w-full sm:w-auto"
          >
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusLabel)}
            className="form-input w-full sm:w-auto"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Foto</th>
                <th className="px-4 lg:px-6 py-3.5">Nombre</th>
                <th className="px-4 lg:px-6 py-3.5">Cédula</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Edad</th>
                <th className="px-4 lg:px-6 py-3.5">Fase</th>
                <th className="px-4 lg:px-6 py-3.5">Estado</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Ingreso</th>
                <th className="px-4 lg:px-6 py-3.5">Cuota</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Próximo pago</th>
                <th className="px-4 lg:px-6 py-3.5">Estado pago</th>
                <th className="px-4 lg:px-6 py-3.5">Teléfono</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Padrino</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && <SkeletonTableRows columns={14} rows={5} />}
              {filtered.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{p.id.slice(-6)}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 border border-slate-200">
                        👤
                      </div>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500">{p.idCard ?? '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{p.age}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <StatusBadge status={p.stage} variant="custom" />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{p.admission}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-700">${(p.monthlyFee ?? 0).toFixed(2)}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden md:table-cell">{p.nextPaymentDate ?? '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    {(() => {
                      const ps = getPaymentStatus(p)
                      return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ps.className}`}>{ps.label}</span>
                    })()}
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500">{p.phone}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">{p.sponsor ?? '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <div className="flex gap-1">
                      {canViewDetail && (
                        <button
                          onClick={() => navigate(`/patients/${p.id}`)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          title="Ver ficha"
                        >
                          Ver ficha
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={14} className="px-6 py-8 text-center text-sm text-slate-400">
                    No se encontraron pacientes con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 lg:px-6 py-3 text-xs text-slate-400 flex justify-between">
          <span>
            Mostrando {filtered.length} de {patients.length} pacientes
          </span>
        </div>
      </div>

      <PatientForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <ExcelImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
        }}
      />
    </div>
  )
}