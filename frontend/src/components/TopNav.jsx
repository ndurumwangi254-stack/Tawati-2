import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { iconBtn, brandMark } from '../styles/ui'

const OWNER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◉' },
  { to: '/dispense', label: 'Dispense', icon: '🛒' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/products', label: 'Shop Items', icon: '🧴' },
  { to: '/stock', label: 'Stock', icon: '🕐' },
  { to: '/suppliers', label: 'Suppliers', icon: '🏢' },
  { to: '/patients', label: 'Patients', icon: '👥' },
  { to: '/alerts', label: 'Alerts', icon: '⚠' },
  { to: '/reports', label: 'Reports', icon: '📊' },
]

const WORKER_LINKS = [
  { to: '/dispense', label: 'Dispense', icon: '🛒' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/products', label: 'Shop Items', icon: '🧴' },
  { to: '/patients', label: 'Patients', icon: '👥' },
  { to: '/alerts', label: 'Alerts', icon: '⚠' },
]

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-1.5 px-3 py-2 border-b-2 text-sm font-medium no-underline whitespace-nowrap ${
    isActive ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'
  }`

export default function TopNav() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const links = currentUser?.role === 'owner' ? OWNER_LINKS : WORKER_LINKS

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="flex items-center justify-between px-5 sm:px-4 h-[64px] border-b border-border bg-white sticky top-0 z-10">
        <a className="flex items-center gap-2.5 font-display font-bold text-base tracking-tight text-ink no-underline whitespace-nowrap" href="/dashboard">
          <span className={`${brandMark} w-8 h-8 text-sm`}>T</span>
          <div className="leading-tight">
            <div>Tawati Chemist</div>
            <div className="text-[11px] font-normal text-muted hidden sm:block">Pharmacy POS &amp; Stock</div>
          </div>
        </a>

        <div className="hidden md:flex h-full">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass}>
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3 relative">
          <NavLink to="/dispense" className={`${iconBtn} md:hidden`} aria-label="Dispense" title="Dispense">
            🛒
          </NavLink>
          <button className={`${iconBtn} md:hidden`} aria-label="Menu" onClick={() => setMobileNavOpen(true)}>
            ☰
          </button>

          <button
            className="hidden md:flex items-center gap-2 border-none bg-transparent cursor-pointer pl-2"
            aria-label="Account"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`${brandMark} w-8 h-8 text-sm bg-ink`}>
              {currentUser?.name?.[0]?.toUpperCase() || '?'}
            </span>
          </button>
          {menuOpen && (
            <div className="hidden md:block absolute top-[52px] right-0 bg-white border border-border rounded-[10px] shadow-lg min-w-[190px] p-2 z-20">
              <div className="text-[13px] text-muted px-2.5 py-1.5">
                {currentUser?.name} · {currentUser?.role}
              </div>
              {currentUser?.role === 'owner' && (
                <a
                  href="/settings"
                  className="block w-full text-left px-2.5 py-2 rounded-md text-sm text-ink no-underline hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  ⚙ Settings
                </a>
              )}
              <button
                className="block w-full text-left px-2.5 py-2 rounded-md text-sm text-ink bg-transparent border-none cursor-pointer hover:bg-gray-100"
                onClick={handleLogout}
              >
                ↩ Log out
              </button>
            </div>
          )}
        </div>
      </nav>

      {mobileNavOpen && (
        <div className="fixed inset-0 bg-white z-30 p-5">
          <div className="flex justify-end mb-6">
            <button className={iconBtn} onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
              ✕
            </button>
          </div>
          {links.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="flex items-center gap-3 py-3.5 px-1 text-[17px] text-ink no-underline border-b border-border"
              onClick={(e) => {
                e.preventDefault()
                setMobileNavOpen(false)
                navigate(l.to)
              }}
            >
              <span>{l.icon}</span>
              {l.label}
            </a>
          ))}
          {currentUser?.role === 'owner' && (
            <a
              href="/settings"
              className="flex items-center gap-3 py-3.5 px-1 text-[17px] text-ink no-underline border-b border-border"
              onClick={(e) => {
                e.preventDefault()
                setMobileNavOpen(false)
                navigate('/settings')
              }}
            >
              <span>⚙</span>
              Settings
            </a>
          )}
          <a
            href="/login"
            className="flex items-center gap-3 py-3.5 px-1 text-[17px] text-ink no-underline border-b border-border"
            onClick={(e) => {
              e.preventDefault()
              setMobileNavOpen(false)
              handleLogout()
            }}
          >
            <span>↩</span>
            Log out
          </a>
        </div>
      )}
    </>
  )
}
