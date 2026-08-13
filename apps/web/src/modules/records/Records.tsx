import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecords } from '../../hooks/useRecords'
import StatusBadge from '../../components/ui/StatusBadge'
import type { Patient } from '../../types/patient'

export default function Records() {
  const { records, patients, loading } = useRecords()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const withRecord = records.filter((r) => r.patientId).length
    const withoutRecord = patients.filter((p) => !records.find((r) => r.patientId === p.id)).length
    return { withRecord, withoutRecord }
  }, [records, patients])

  function openRecord(patientId: string, recordId?: string) {
    if (recordId) navigate(`/records/${recordId}`)
    else navigate(`/records/new/${patientId}`)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Fichas Médicas</h2>
        <p className="text-slate-500">Historiales clínicos de pacientes</p>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Historiales Abiertos</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{stats.withRecord}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sin Ficha Inicial</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{stats.withoutRecord}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pacientes</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-700">{patients.length}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID Paciente</th>
                <th className="px-4 lg:px-6 py-3.5">Nombre</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Edad</th>
                <th className="px-4 lg:px-6 py-3.5">Fase</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Doctor</th>
                <th className="px-4 lg:px-6 py-3.5">Historial</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Última Entrada</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {patients.map((p: Patient) => {
                const rec = records.find((r) => r.patientId === p.id)
                return (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{p.id.slice(-6)}</td>
                    <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{p.age}</td>
                    <td className="px-4 lg:px-6 py-3.5">
                      <StatusBadge status={p.stage} variant="custom" />
                    </td>
                    <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{rec?.doctorName ?? p.assignedDoctorName ?? '—'}</td>
                    <td className="px-4 lg:px-6 py-3.5">
                      {rec ? (
                        <StatusBadge status="Con historial" variant="activo" />
                      ) : (
                        <StatusBadge status="Sin abrir" variant="pendiente" />
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">{rec?.updatedAt ?? '—'}</td>
                    <td className="px-4 lg:px-6 py-3.5">
                      {rec ? (
                        <button
                          onClick={() => openRecord(p.id, rec.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          Ver Historial
                        </button>
                      ) : (
                        <button
                          onClick={() => openRecord(p.id)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                        >
                          Abrir Ficha
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {patients.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay pacientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}