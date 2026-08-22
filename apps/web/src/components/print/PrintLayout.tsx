import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsLive } from '../../hooks/useSettings'

interface PrintLayoutProps {
  title: string
  children: ReactNode
}

/** Shared shell for printable documents: no app chrome, a screen-only toolbar
 * (hidden via .screen-only at print time — see index.css), and a letterhead
 * using the center name configured in Settings. */
export default function PrintLayout({ title, children }: PrintLayoutProps) {
  const navigate = useNavigate()
  const { settings } = useSettingsLive()

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="screen-only mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      <div className="print-page mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none">
        <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{settings.centerName}</h1>
            <p className="text-sm text-slate-500">{title}</p>
          </div>
          <p className="text-right text-xs text-slate-400">
            Generado el {new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
