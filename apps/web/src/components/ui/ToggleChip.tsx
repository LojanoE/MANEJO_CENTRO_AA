/** Opción marcable en forma de píldora (selección simple o múltiple). */
export default function ToggleChip({
  label,
  code,
  active,
  onClick,
  disabled = false,
}: {
  label: string
  code?: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
        active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
      }`}
    >
      {code && <span className={active ? 'text-emerald-100' : 'text-slate-400'}>{code}</span>}
      {label}
    </button>
  )
}
