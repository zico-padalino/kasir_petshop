import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const MENU = [
  { group: 'Menu', items: [{ to: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard', roles: ['admin', 'kasir', 'owner'] }] },
  {
    group: 'Transaksi',
    items: [
      { to: '/pos', icon: 'bi-cart3', label: 'Kasir / POS', roles: ['admin', 'kasir', 'owner'] },
      { to: '/transactions', icon: 'bi-receipt', label: 'Riwayat Transaksi', roles: ['admin', 'kasir', 'owner'] },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { to: '/products', icon: 'bi-box-seam', label: 'Produk', roles: ['admin', 'owner'] },
      { to: '/reports', icon: 'bi-bar-chart', label: 'Laporan Penjualan', roles: ['admin', 'owner'] },
    ],
  },
  {
    group: 'Manajemen',
    items: [
      { to: '/categories', icon: 'bi-tags', label: 'Kategori', roles: ['admin'] },
      { to: '/users', icon: 'bi-people', label: 'Pengguna & Role', roles: ['admin'] },
    ],
  },
]

const BOTTOM = [
  { to: '/dashboard', icon: 'bi-speedometer2', label: 'Home', roles: ['admin', 'kasir', 'owner'] },
  { to: '/pos', icon: 'bi-cart3', label: 'Kasir', roles: ['admin', 'kasir', 'owner'] },
  { to: '/transactions', icon: 'bi-receipt', label: 'Riwayat', roles: ['admin', 'kasir', 'owner'] },
  { to: '/products', icon: 'bi-box-seam', label: 'Produk', roles: ['admin', 'owner'] },
  { to: '/reports', icon: 'bi-bar-chart', label: 'Laporan', roles: ['admin', 'owner'] },
]

export default function Layout() {
  const { user, signOut, can } = useAuth()
  const { toast, dismiss } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    signOut()
    navigate('/login', { replace: true })
  }

  const bottomItems = BOTTOM.filter((i) => can(...i.roles)).slice(0, 5)

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo">🐾</div>
          <div className="brand-text">PetShop<br />E-POS</div>
        </div>
        <nav className="sidebar-menu">
          {MENU.map((section) => {
            const items = section.items.filter((i) => can(...i.roles))
            if (!items.length) return null
            return (
              <div key={section.group}>
                <div className="menu-label">{section.group}</div>
                {items.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <i className={`bi ${i.icon}`}></i> {i.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn-toggle" onClick={() => setSidebarOpen((o) => !o)}>
              <i className="bi bi-list"></i>
            </button>
          </div>
          <div className="topbar-right">
            <div className="topbar-info">
              <strong>PetShop Dzikra</strong>
              Sistem Kasir Elektronik
            </div>
            <div className="badge-role">
              <i className="bi bi-shield-check"></i>
              {user?.role_name ?? 'User'}
            </div>
            <div className="user-dropdown">
              <div className="user-avatar">{(user?.name ?? '?').charAt(0).toUpperCase()}</div>
              <div>
                <strong style={{ fontSize: 12, display: 'block' }}>{user?.name}</strong>
                <button className="btn btn-sm btn-outline" style={{ marginTop: 2 }} onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="content-area">
          {toast && (
            <div className={`alert-custom ${toast.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
              <span className="alert-icon">
                <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
              </span>
              <div className="alert-body">
                <strong>{toast.type === 'success' ? 'Berhasil' : 'Gagal'}</strong>
                {toast.message}
              </div>
              <button className="alert-close" onClick={dismiss}>&times;</button>
            </div>
          )}
          <Outlet />
        </main>

        <footer className="footer">
          &copy; {new Date().getFullYear()} PetShop E-POS — Versi Mobile
        </footer>
      </div>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {bottomItems.map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <i className={`bi ${i.icon}`}></i>
              {i.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
