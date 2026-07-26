import { useMemo, useState } from 'react'
import { getActivityLogs } from '../db/store'
import { dateTimeShort, dateShort, todayInput, monthStartInput } from '../utils/format'

const MODULES = [
  { id: '', label: 'Semua' },
  { id: 'auth', label: 'Login', emoji: '🔑' },
  { id: 'pos', label: 'Penjualan', emoji: '🛒' },
  { id: 'hotel', label: 'Pet Hotel', emoji: '🏠' },
  { id: 'stock_opname', label: 'Stok Opname', emoji: '📋' },
  { id: 'product', label: 'Produk', emoji: '📦' },
  { id: 'category', label: 'Kategori', emoji: '🏷️' },
  { id: 'user', label: 'Pengguna', emoji: '👥' },
  { id: 'system', label: 'Sistem', emoji: '⚙️' },
]

const MODULE_META = {
  auth: { emoji: '🔑', color: 'teal', label: 'Login' },
  pos: { emoji: '🛒', color: 'green', label: 'Penjualan' },
  hotel: { emoji: '🏠', color: 'blue', label: 'Pet Hotel' },
  stock_opname: { emoji: '📋', color: 'orange', label: 'Stok Opname' },
  product: { emoji: '📦', color: 'blue', label: 'Produk' },
  category: { emoji: '🏷️', color: 'orange', label: 'Kategori' },
  user: { emoji: '👥', color: 'green', label: 'Pengguna' },
  system: { emoji: '⚙️', color: 'teal', label: 'Sistem' },
}

const ROLE_LABEL = {
  admin: 'Admin',
  kasir: 'Kasir',
  owner: 'Owner',
}

export default function ActivityLogs() {
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(monthStartInput())
  const [dateTo, setDateTo] = useState(todayInput())
  const [applied, setApplied] = useState({
    module: '',
    search: '',
    dateFrom: monthStartInput(),
    dateTo: todayInput(),
  })

  const logs = useMemo(() => getActivityLogs({ ...applied, limit: 300 }), [applied])

  function apply(e) {
    e.preventDefault()
    setApplied({ module, search, dateFrom, dateTo })
  }

  // group by date for readability
  const groups = useMemo(() => {
    const map = {}
    logs.forEach((l) => {
      const d = (l.created_at || '').slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(l)
    })
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [logs])

  return (
    <>
      <div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Log Aktivitas</h1>
        <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
          Riwayat kegiatan karyawan di toko — hanya Owner yang bisa melihat.
        </p>
      </div>
      <div style={{ height: 14 }} />

      <div className="home-tip" style={{ marginTop: 0, marginBottom: 14 }}>
        <strong>Untuk Owner:</strong> Pantau siapa yang jual barang, titip hewan, ubah stok, atau login.
        Ketuk filter modul di bawah untuk fokus ke satu jenis kegiatan.
      </div>

      <div className="category-tabs">
        {MODULES.map((m) => (
          <button
            key={m.id || 'all'}
            type="button"
            className={`category-tab ${module === m.id ? 'active' : ''}`}
            onClick={() => {
              setModule(m.id)
              setApplied((a) => ({ ...a, module: m.id }))
            }}
          >
            {m.emoji ? `${m.emoji} ` : ''}{m.label}
          </button>
        ))}
      </div>

      <form className="search-bar" onSubmit={apply} style={{ marginBottom: 16 }}>
        <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <span style={{ alignSelf: 'center', color: '#666' }}>s/d</span>
        <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} />
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama / keterangan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-funnel"></i> Tampilkan</button>
      </form>

      <div className="home-summary" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="home-summary-item">
          <div className="home-summary-value">{logs.length}</div>
          <div className="home-summary-label">Aktivitas ditampilkan</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{new Set(logs.map((l) => l.user_name)).size}</div>
          <div className="home-summary-label">Orang terlibat</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{groups.length}</div>
          <div className="home-summary-label">Hari</div>
        </div>
      </div>

      {groups.length ? groups.map(([day, items]) => (
        <div key={day} className="alog-day">
          <div className="alog-day-title">
            <i className="bi bi-calendar3"></i> {dateShort(day)}
            <span className="alog-day-count">{items.length} aktivitas</span>
          </div>
          <div className="alog-list">
            {items.map((l) => {
              const meta = MODULE_META[l.module] || { emoji: '📌', color: 'teal', label: l.module }
              return (
                <div key={l.id} className={`alog-item alog-${meta.color}`}>
                  <div className="alog-emoji">{meta.emoji}</div>
                  <div className="alog-body">
                    <div className="alog-desc">{l.description}</div>
                    <div className="alog-meta">
                      <span className="alog-who">{l.user_name}</span>
                      {l.role_slug && (
                        <span className="badge badge-info">{ROLE_LABEL[l.role_slug] || l.role_slug}</span>
                      )}
                      <span className="alog-mod">{meta.label}</span>
                      <span className="alog-time">{dateTimeShort(l.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )) : (
        <div className="card">
          <div className="empty-state">
            <i className="bi bi-journal-x"></i>
            Belum ada aktivitas pada filter ini
          </div>
        </div>
      )}
    </>
  )
}
