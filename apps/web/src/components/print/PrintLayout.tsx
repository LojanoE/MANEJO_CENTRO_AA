import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsLive } from '../../hooks/useSettings'

interface PrintLayoutProps {
  title: string
  children: ReactNode
}

/**
 * Shared shell for printable documents: no app chrome, a screen-only toolbar
 * (hidden via .screen-only at print time — see index.css), and the center's
 * letterhead (logo, name, subtitle) configured in Settings.
 *
 * The letterhead lives in a <thead> and the footer spacer in a <tfoot> so the
 * browser repeats them on every printed page; the footer itself is
 * `position: fixed` in print, which also repeats per page.
 */
export default function PrintLayout({ title, children }: PrintLayoutProps) {
  const navigate = useNavigate()
  const { settings } = useSettingsLive()

  const footer = [
    settings.centerPhone && `Celular: ${settings.centerPhone}`,
    settings.centerAddress && `Dirección: ${settings.centerAddress}`,
  ]
    .filter(Boolean)
    .join('   ·   ')

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="screen-only mx-auto mb-4 flex max-w-[210mm] items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      <div className="print-page mx-auto max-w-[210mm] overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm print:max-w-none print:overflow-visible print:rounded-none">
        <table className="print-frame w-full">
          <thead>
            <tr>
              <td>
                <header className="mb-3 grid grid-cols-[72px_1fr_72px] items-center gap-3 border-b-2 border-slate-800 pb-2">
                  <div>
                    {settings.logoUrl && (
                      <img src={settings.logoUrl} alt="" className="h-16 w-16 object-contain" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-extrabold uppercase tracking-wide text-slate-900">{settings.centerName}</p>
                    {settings.centerSubtitle && (
                      <p className="text-[9.5px] font-semibold uppercase leading-tight text-slate-600">{settings.centerSubtitle}</p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-700">{title}</p>
                  </div>
                  <p className="text-right text-[8.5px] leading-tight text-slate-400">
                    Generado el
                    <br />
                    {new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </header>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{children}</td>
            </tr>
          </tbody>
          {footer && (
            <tfoot>
              <tr>
                <td>
                  <div className="print-footer-space" />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {footer && (
          <footer className="print-footer mt-6 border-t border-slate-300 pt-1 text-center text-[9px] text-slate-500">
            {footer}   ·   {settings.centerName}
          </footer>
        )}
      </div>
    </div>
  )
}
