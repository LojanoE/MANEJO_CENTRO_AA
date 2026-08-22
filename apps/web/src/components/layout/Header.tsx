import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { signOut } from '../../firebase/auth'
import { ROLE_LABELS, ROLE_BADGE_CLASS } from '../../config/nav'

interface HeaderProps {
  onMenuClick: () => void
  onCollapseClick: () => void
}

export default function Header({ onMenuClick, onCollapseClick }: HeaderProps) {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout() {
    await signOut()
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 lg:px-6 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Abrir menú"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={onCollapseClick}
            className="hidden md:flex rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Colapsar menú"
            title="Colapsar/Expandir menú"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg text-white shadow-md">🕊️</div>
          <div>
            <h1 className="text-base lg:text-lg font-bold leading-tight text-emerald-900">Centro AA</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Sistema de Gestión Integral</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <span className={`status-badge ${ROLE_BADGE_CLASS[user.role]} uppercase tracking-wide hidden sm:inline-flex`}>
            {ROLE_LABELS[user.role]}
          </span>
          <div className="flex h-8 w-8 lg:h-9 lg:w-9 rounded-full bg-emerald-700 items-center justify-center text-xs lg:text-sm font-bold text-white shadow">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition min-h-[40px]"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}