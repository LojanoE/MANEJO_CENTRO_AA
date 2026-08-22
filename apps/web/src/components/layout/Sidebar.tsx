import { Link, useLocation } from 'react-router-dom'
import { NAV_CONFIG } from '../../config/nav'
import type { Role } from '../../types/user'
import type { NavItem } from '../../config/nav'
import { useAuthStore } from '../../stores/authStore'

interface SidebarProps {
  mobileOpen: boolean
  collapsed: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ mobileOpen, collapsed, onCloseMobile }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) return null
  const role = user.role as Role
  const items = NAV_CONFIG[role] ?? NAV_CONFIG.admin

  function navPath(item: NavItem): string {
    if (item.path) return item.path
    return item.id === 'dashboard' ? '/' : `/${item.id}`
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static left-0 top-0 bottom-0 z-50 bg-white border-r border-slate-200 p-4 flex flex-col overflow-y-auto transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-64 ${collapsed ? 'md:w-20' : 'md:w-64'}`
        }
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-sm text-white">🕊️</div>
            <span className="font-bold text-emerald-900">Menú</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar menú"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1 flex-1">
          {items.map((item) => {
            const path = navPath(item)
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
            return (
              <Link
                key={item.id}
                to={path}
                onClick={onCloseMobile}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                  ${active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  ${collapsed ? 'md:justify-center' : ''}`}
                title={item.label}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={`mt-auto rounded-xl bg-slate-50 p-4 border border-slate-100 md:hidden ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Arquitectura</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />GitHub (Repositorio)</div>
            <div className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />Firebase Auth</div>
            <div className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />Cloud Firestore</div>
            <div className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />Cloud Functions</div>
            <div className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />Drive + Hosting</div>
          </div>
        </div>
      </aside>
    </>
  )
}