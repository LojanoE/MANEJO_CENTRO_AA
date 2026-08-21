import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import Modal from './Modal'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button for destructive actions (default) vs. green for neutral confirmations. */
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface PendingConfirm {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger: boolean
  resolve: (value: boolean) => void
}

/**
 * Replaces native `confirm()` dialogs (blocking, unstyled, unusable in some embedded
 * contexts) with a styled modal. Usage mirrors `confirm()`: `if (await confirm('¿Seguro?')) { ... }`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirmFn = useCallback<ConfirmFn>((options) => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setPending({
        title: opts.title ?? 'Confirmar acción',
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Confirmar',
        cancelLabel: opts.cancelLabel ?? 'Cancelar',
        danger: opts.danger ?? true,
        resolve,
      })
    })
  }, [])

  function close(result: boolean) {
    pending?.resolve(result)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      <Modal open={!!pending} title={pending?.title ?? ''} onClose={() => close(false)} size="sm">
        {pending && (
          <>
            <p className="text-sm text-slate-600">{pending.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => close(false)} className="btn-secondary">
                {pending.cancelLabel}
              </button>
              <button
                onClick={() => close(true)}
                className={`rounded-xl px-5 py-2.5 min-h-[44px] text-sm font-bold text-white transition active:scale-95 ${
                  pending.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs next to its context/provider
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}
