interface CardStatProps {
  label: string
  value: string | number
  icon: string
  color?: 'emerald' | 'blue' | 'amber' | 'violet' | 'red'
  foot?: string
}

const COLOR_MAP: Record<NonNullable<CardStatProps['color']>, { bg: string; text: string; foot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', foot: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', foot: 'text-blue-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', foot: 'text-amber-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', foot: 'text-violet-600' },
  red: { bg: 'bg-red-50', text: 'text-red-700', foot: 'text-red-600' },
}

export default function CardStat({ label, value, icon, color = 'emerald', foot }: CardStatProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-extrabold ${c.text}`}>{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} text-2xl`}>{icon}</div>
      </div>
      {foot && <p className={`mt-3 text-xs font-medium ${c.foot}`}>{foot}</p>}
    </div>
  )
}