interface PlaceholderProps {
  title: string
  description?: string
  icon?: string
}

export default function Placeholder({ title, description, icon = '🚧' }: PlaceholderProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {description && <p className="text-slate-500">{description}</p>}
      </div>
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">{icon}</div>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">Módulo en desarrollo — próximamente</p>
      </div>
    </div>
  )
}