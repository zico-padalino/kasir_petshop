import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getShopSettings } from '../db/store'

const MENU = [
  { group: 'Utama', items: [{ to: '/dashboard', icon: 'bi-house-door', label: 'Beranda', roles: ['admin', 'kasir', 'owner'] }] },
  {
    group: 'Toko',
    items: [
      { to: '/pos', icon: 'bi-cart3', label: 'Jual Barang', roles: ['admin', 'kasir', 'owner'] },
      { to: '/cash-drawer', icon: 'bi-safe', label: 'Uang Kasir', roles: ['admin', 'kasir', 'owner'] },
      { to: '/attendance', icon: 'bi-person-badge', label: 'Absensi', roles: ['admin', 'kasir', 'owner'] },
      { to: '/transactions', icon: 'bi-receipt', label: 'Riwayat Jual', roles: ['admin', 'kasir', 'owner'] },
      { to: '/pet-hotel', icon: 'bi-house-heart', label: 'Titip Hewan', roles: ['admin', 'kasir', 'owner'] },
    ],
  },
  {
    group: 'Barang & Laporan',
    items: [
      { to: '/products', icon: 'bi-box-seam', label: 'Stok Barang', roles: ['admin', 'owner'] },
      { to: '/stock-opname', icon: 'bi-clipboard-check', label: 'Stok Opname', roles: ['admin', 'owner'] },
      { to: '/reports', icon: 'bi-bar-chart', label: 'Laporan Uang', roles: ['admin', 'owner'] },
      { to: '/activity-logs', icon: 'bi-journal-text', label: 'Log Aktivitas', roles: ['owner'] },
    ],
  },
  {
    group: 'Pengaturan',
    items: [
      { to: '/settings', icon: 'bi-shop', label: 'Toko & Struk', roles: ['admin', 'owner'] },
      { to: '/categories', icon: 'bi-tags', label: 'Kategori Barang', roles: ['admin'] },
      { to: '/users', icon: 'bi-people', label: 'Pengguna', roles: ['admin', 'owner'] },
    ],
  },
]

const BOTTOM = [
  { to: '/dashboard', icon: 'bi-house-door', label: 'Beranda', roles: ['admin', 'kasir', 'owner'] },
  { to: '/pos', icon: 'bi-cart3', label: 'Jual', roles: ['admin', 'kasir', 'owner'] },
  { to: '/pet-hotel', icon: 'bi-house-heart', label: 'Titip', roles: ['admin', 'kasir', 'owner'] },
  { to: '/transactions', icon: 'bi-receipt', label: 'Riwayat', roles: ['admin', 'kasir', 'owner'] },
  { to: '/products', icon: 'bi-box-seam', label: 'Stok', roles: ['admin', 'owner'] },
]

const SIDEBAR_KEY = 'kasir_dzikra_sidebar_collapsed'

function isMobileLayout() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 992px)').matches
}

export default function Layout() {
  const { user, signOut, can } = useAuth()
  const { toast, dismiss } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const navigate = useNavigate()

  function handleLogout() {
    signOut()
    navigate('/login', { replace: true })
  }

  function toggleSidebar() {
    if (isMobileLayout()) {
      setSidebarOpen((o) => !o)
      return
    }
    setSidebarCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch { /* ignore */ }
      return next
    })
  }

  function closeMobileSidebar() {
    setSidebarOpen(false)
  }

  const bottomItems = BOTTOM.filter((i) => can(...i.roles)).slice(0, 5)
  const shop = getShopSettings()
  const brandLines = (shop.shop_name || 'pet Shop').split(/\s+/)
  const brandLine1 = brandLines[0] || 'pet'
  const brandLine2 = brandLines.slice(1).join(' ') || 'Shop'

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo">
            {shop.logo ? <img src={shop.logo} alt="" /> : '🐾'}
          </div>
          <div className="brand-text">{brandLine1}{brandLine2 ? <><br />{brandLine2}</> : null}</div>
          <button
            type="button"
            className="btn-sidebar-close"
            onClick={toggleSidebar}
            title="Sembunyikan menu"
            aria-label="Sembunyikan menu"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
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
                    onClick={closeMobileSidebar}
                  >
                    <i className={`bi ${i.icon}`}></i> {i.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`} onClick={closeMobileSidebar} />

      <div className={`main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn-toggle"
              onClick={toggleSidebar}
              title={sidebarCollapsed || sidebarOpen ? 'Tampilkan menu' : 'Sembunyikan menu'}
              aria-label="Toggle sidebar"
            >
              <i className={`bi ${sidebarCollapsed && !sidebarOpen ? 'bi-layout-sidebar' : 'bi-list'}`}></i>
            </button>
          </div>
          <div className="topbar-right">
            <div className="topbar-info">
              <strong>{shop.shop_name}</strong>
              {shop.tagline || 'Toko & penitipan hewan'}
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
          &copy; {new Date().getFullYear()} {shop.shop_name} — {shop.tagline || 'Mudah dipakai untuk toko hewan'}
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
