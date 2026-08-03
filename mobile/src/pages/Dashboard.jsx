import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { rupiah, dateTimeShort } from '../utils/format'

const ACTIONS = [
  {
    to: '/pos',
    emoji: '🛒',
    title: 'Jual Barang',
    desc: 'Catat penjualan di kasir',
    color: 'teal',
    roles: ['admin', 'kasir', 'owner'],
  },
  {
    to: '/cash-drawer',
    emoji: '💵',
    title: 'Uang Kasir',
    desc: 'Setor, tarik & saldo laci',
    color: 'green',
    roles: ['admin', 'kasir', 'owner'],
  },
  {
    to: '/pet-hotel',
    emoji: '🏠',
    title: 'Titip Hewan',
    desc: 'Pet hotel & penitipan',
    color: 'green',
    roles: ['admin', 'kasir', 'owner'],
  },
  {
    to: '/pet-hotel/rooms',
    emoji: '🚪',
    title: 'Lihat Kamar',
    desc: 'Kamar hotel yang tersedia',
    color: 'blue',
    roles: ['admin', 'kasir', 'owner'],
  },
  {
    to: '/transactions',
    emoji: '🧾',
    title: 'Riwayat Jual',
    desc: 'Lihat semua penjualan',
    color: 'orange',
    roles: ['admin', 'kasir', 'owner'],
  },
  {
    to: '/products',
    emoji: '📦',
    title: 'Stok Barang',
    desc: 'Daftar produk toko',
    color: 'blue',
    roles: ['admin', 'owner'],
  },
  {
    to: '/stock-opname',
    emoji: '📋',
    title: 'Stok Opname',
    desc: 'Admin isi, Owner cek hasil',
    color: 'orange',
    roles: ['admin', 'owner'],
  },
  {
    to: '/reports',
    emoji: '📊',
    title: 'Laporan Uang',
    desc: 'Rekap penjualan toko',
    color: 'teal',
    roles: ['admin', 'owner'],
  },
  {
    to: '/activity-logs',
    emoji: '📝',
    title: 'Log Aktivitas',
    desc: 'Pantau kegiatan karyawan',
    color: 'green',
    roles: ['owner'],
  },
  {
    to: '/categories',
    emoji: '🏷️',
    title: 'Kategori',
    desc: 'Kelompok produk',
    color: 'orange',
    roles: ['admin'],
  },
  {
    to: '/users',
    emoji: '👥',
    title: 'Pengguna',
    desc: 'Akun karyawan toko',
    color: 'green',
    roles: ['admin', 'owner'],
  },
]

export default function Dashboard() {
  const { user, can } = useAuth()
  const { stats, lowStock, recentTransactions } = useMemo(() => getDashboardStats(), [])
  const actions = ACTIONS.filter((a) => can(...a.roles))
  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  return (
    <>
      <div className="home-hero">
        <div className="home-hero-text">
          <p className="home-greet">{greeting}, {user?.name?.split(' ')[0] || 'Kak'} 👋</p>
          <h1 className="home-title">PetShop Dzikra</h1>
          <p className="home-sub">Toko & penitipan hewan — pilih menu di bawah untuk mulai</p>
        </div>
        <div className="home-hero-paw">🐾</div>
      </div>

      <h2 className="home-section-title">Mau ngapain hari ini?</h2>
      <div className="home-actions">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className={`home-action home-action-${a.color}`}>
            <span className="home-action-emoji">{a.emoji}</span>
            <span className="home-action-title">{a.title}</span>
            <span className="home-action-desc">{a.desc}</span>
          </Link>
        ))}
      </div>

      <h2 className="home-section-title">Ringkasan hari ini</h2>
      <div className="home-summary">
        <div className="home-summary-item">
          <div className="home-summary-value">{stats.today_transactions}</div>
          <div className="home-summary-label">Penjualan</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{rupiah(stats.today_revenue)}</div>
          <div className="home-summary-label">Uang masuk</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{stats.hotelActive ?? 0}</div>
          <div className="home-summary-label">Hewan dititip</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{stats.hotelReserved ?? 0}</div>
          <div className="home-summary-label">Reservasi hotel</div>
        </div>
      </div>

      {(lowStock.length > 0 || recentTransactions.length > 0) && (
        <div className="grid-2" style={{ marginTop: 8 }}>
          {lowStock.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span>⚠️ Stok hampir habis</span>
                {can('admin', 'owner') && <Link to="/products" className="btn btn-sm btn-outline">Cek stok</Link>}
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead><tr><th>Barang</th><th>Sisa</th></tr></thead>
                  <tbody>
                    {lowStock.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td><span className="badge badge-warning">{item.stock}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recentTransactions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span>🧾 Penjualan terbaru</span>
                <Link to="/transactions" className="btn btn-sm btn-outline">Semua</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead><tr><th>No</th><th>Total</th><th>Waktu</th></tr></thead>
                    <tbody>
                      {recentTransactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id}>
                          <td><Link to={`/transactions/${tx.id}`} style={{ color: 'var(--primary)' }}>{tx.invoice_number}</Link></td>
                          <td>{rupiah(tx.total)}</td>
                          <td>{dateTimeShort(tx.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="home-tip">
        <strong>Tips:</strong> Untuk jual barang ketuk <em>Jual Barang</em>. Untuk penitipan hewan ketuk <em>Titip Hewan</em>.
      </div>
    </>
  )
}
