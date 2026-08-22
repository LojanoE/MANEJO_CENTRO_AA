import { useParams } from 'react-router-dom'
import { useMedicalAuths } from '../../hooks/useMedicalAuths'
import PrintLayout from '../../components/print/PrintLayout'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-slate-200 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value || '—'}</span>
    </div>
  )
}

export default function PrintAuth() {
  const { authId } = useParams<{ authId: string }>()
  const { auths, loading } = useMedicalAuths()
  const auth = auths.find((a) => a.id === authId)

  if (!auth) {
    return (
      <PrintLayout title="Autorización médica">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Autorización no encontrada.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title="Autorización médica">
      <Row label="Paciente" value={auth.patientName} />
      <Row label="Tipo de autorización" value={auth.type} />
      <Row label="Fecha" value={auth.date} />
      <Row label="Médico" value={auth.doctorName ?? ''} />

      <div
        className={`mt-6 rounded-xl px-4 py-4 text-center text-lg font-extrabold ${
          auth.status === 'Aprobado'
            ? 'bg-emerald-50 text-emerald-800'
            : auth.status === 'Denegado'
              ? 'bg-red-50 text-red-800'
              : 'bg-amber-50 text-amber-800'
        }`}
      >
        {auth.status}
      </div>

      {auth.notes && (
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notas</p>
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{auth.notes}</p>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
        <div className="border-t border-slate-300 pt-2">Firma médico tratante</div>
        <div className="border-t border-slate-300 pt-2">Firma responsable</div>
      </div>
    </PrintLayout>
  )
}
