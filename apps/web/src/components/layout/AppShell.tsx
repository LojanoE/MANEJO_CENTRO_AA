import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        onMenuClick={() => setMobileOpen(true)}
        onCollapseClick={() => setCollapsed((c) => !c)}
      />
      <div className="flex flex-1 relative">
        <Sidebar
          mobileOpen={mobileOpen}
          collapsed={collapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-slate-50 w-full">
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}