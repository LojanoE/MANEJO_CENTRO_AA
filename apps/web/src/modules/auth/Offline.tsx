export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-2xl border border-slate-100 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-4xl">
          📴
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Sin conexión</h1>
        <p className="mt-2 text-sm text-slate-500">
          No estás conectado a Internet. La app seguirá mostrando los datos
          almacenados localmente; los cambios que hagas se sincronizarán
          cuando vuelva la conexión.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 transition"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}