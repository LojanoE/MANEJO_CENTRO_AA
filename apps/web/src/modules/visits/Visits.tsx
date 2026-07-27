import { useMemo, useState } from 'react'
import { useVisits, VISIT_STATUSES, VISIT_TYPES } from '../../hooks/useVisits'
import { useAuthStore } from '../../stores/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import PatientSelect from '../../components/ui/PatientSelect'
import type { Visit, VisitInput, VisitStatus, VisitType } from '../../types/visit'

const todayISO = () => new Date().toISOString().slice(0, 10)

const EMPTY: VisitInput = {
  patientId: null,
  visitor: '',
  date: todayISO(),
  time: '10:00',
  status: 'Pendiente',
  type: 'Familiar',
  notes: '',
}

export default function Visits() {
  const { visits, patients, loading, error, create, setStatus, remove } = useVisits()
  const user = useAuthStore((s) => s.user)
  const isMedico = user?.role === 'medico'
  const isMedicoActive = isMedico || user?.role === 'admin'

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<VisitInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const stats = useMemo(() => {
    const today = todayISO()
    return {
      today: visits.filter((v) => v.date === today).length,
      approved: visits.filter((v) => v.status === 'Aprobado').length,
      pending: visits.filter((v) => v.status === 'Pendiente' || v.status === 'Requiere autorización').length,
      denied: visits.filter((v) => v.status === 'Denegado').length,
    }
  }, [visits])

  function openNew() {
    setForm(EMPTY)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await create(form)
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(v: Visit) {
    if (confirm(`¿Eliminar visita de ${v.visitor} para ${v.patientName}?`)) {
      await remove(v)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Control de Visitas</h2>
          <p className="text-slate-500">Registro y autorización de visitas familiares y externas</p>
        </div>
        <button onClick={openNew} className="btn-primary self-start sm:self-auto">+ Nueva Solicitud</button>
      </div>

      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Visitas Hoy</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-700">{stats.today}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aprobadas</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{stats.approved}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendientes</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{stats.pending}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Denegadas</p>
          <p className="mt-2 text-2xl font-extrabold text-red-700">{stats.denied}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Paciente</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Visitante</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Tipo</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Hora</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Médico</th>
                <th className="px-4 lg:px-6 py-3.5">Estado</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visits.map((v) => (
                <tr key={v.id} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{v.id.slice(-6)}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{v.patientName}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{v.visitor}</td>
                  <td className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">
                    <StatusBadge status={v.type} variant="custom" />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">{v.date}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">{v.time}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{v.doctorName ?? '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {isMedicoActive && (v.status === 'Pendiente' || v.status === 'Requiere autorización') && (
                        <>
                          <button
                            onClick={() => setStatus(v, 'Aprobado')}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => setStatus(v, 'Denegado')}
                            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 transition"
                          >
                            Denegar
                          </button>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(v)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visits.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay solicitudes de visita registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Nueva Solicitud de Visita" onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="form-label">Paciente *</label>
            <PatientSelect
              patients={patients}
              value={form.patientId}
              onChange={(patientId) => setForm({ ...form, patientId })}
              required
            />
          </div>
          <div>
            <label className="form-label">Visitante *</label>
            <input
              value={form.visitor}
              onChange={(e) => setForm({ ...form, visitor: e.target.value })}
              placeholder="Ej: Sra. Vargas (esposa)"
              className="form-input"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as VisitType })}
                className="form-input"
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Estado inicial</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as VisitStatus })}
                className="form-input"
              >
                {VISIT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Hora</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observaciones sobre la visita…"
              className="form-textarea"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : 'Crear Solicitud'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}