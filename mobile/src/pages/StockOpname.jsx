import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStockOpnames, createStockOpname, cancelStockOpname } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { dateTimeShort } from '../utils/format'

const STATUS_BADGE = {
  draft: 'badge-warning',
  completed: 'badge-success',
  cancelled: 'badge-danger',
}
const STATUS_LABEL = {
  draft: 'Belum selesai',
  completed: 'Sudah selesai',
  cancelled: 'Dibatalkan',
}

export default function StockOpname() {
  const { user, can } = useAuth()
  const isAdmin = can('admin')
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [reload, setReload] = useState(0)

  const rows = useMemo(() => getStockOpnames({ status }), [status, reload])

  function startNew() {
    if (!confirm('Mulai hitung stok baru?\n\nSistem mencatat stok komputer dulu, lalu Anda isi jumlah barang di rak.')) return
    const res = createStockOpname({}, user)
    if (res.ok) {
      toast.success(res.message)
      navigate(`/stock-opname/${res.id}`)
    } else {
      toast.error(res.message)
      if (res.id) navigate(`/stock-opname/${res.id}`)
    }
  }

  function doCancel(id, number) {
    if (!confirm(`Batalkan ${number}?`)) return
    const res = cancelStockOpname(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setReload((r) => r + 1)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Stok Opname</h1>
          <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
            {isAdmin
              ? 'Bandingkan barang di rak dengan catatan komputer.'
              : 'Cek hasil hitungan stok yang sudah diisi Admin.'}
          </p>
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-primary btn-sm" onClick={startNew}>
            <i className="bi bi-plus-lg"></i> Mulai hitung stok
          </button>
        )}
      </div>
      <div style={{ height: 14 }} />

      <div className="op-legend">
        <div className="op-legend-item op-legend-ok"><span>✅</span> Cocok</div>
        <div className="op-legend-item op-legend-plus"><span>⬆️</span> Lebih di toko</div>
        <div className="op-legend-item op-legend-minus"><span>⬇️</span> Kurang di toko</div>
      </div>

      {!isAdmin && (
        <div className="home-tip" style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Untuk Owner:</strong> Ketuk <em>Cek hasil</em> untuk melihat barang mana yang kurang/lebih.
        </div>
      )}

      <div className="category-tabs" style={{ marginBottom: 14 }}>
        {[
          { id: '', label: 'Semua' },
          { id: 'draft', label: 'Belum selesai' },
          { id: 'completed', label: 'Sudah selesai' },
          { id: 'cancelled', label: 'Dibatalkan' },
        ].map((t) => (
          <button
            key={t.id || 'all'}
            type="button"
            className={`category-tab ${status === t.id ? 'active' : ''}`}
            onClick={() => setStatus(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="op-list">
        {rows.length ? rows.map((o) => (
          <div key={o.id} className="op-card">
            <div className="op-card-top">
              <div>
                <div className="op-card-title">{o.opname_number}</div>
                <div className="op-card-meta">{dateTimeShort(o.created_at)} · oleh {o.cashier_name}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
            </div>

            {(o.status === 'completed' || o.status === 'draft') && (
              <div className="op-card-stats">
                <span className="op-chip ok">✅ {o.matched} cocok</span>
                <span className="op-chip plus">⬆️ {o.plus} lebih</span>
                <span className="op-chip minus">⬇️ {o.minus} kurang</span>
                <span className="op-chip">{o.item_count} barang</span>
              </div>
            )}

            {o.notes && <div className="op-card-note">📝 {o.notes}</div>}

            <div className="op-card-actions">
              <Link to={`/stock-opname/${o.id}`} className="btn btn-sm btn-primary">
                <i className="bi bi-eye"></i>{' '}
                {isAdmin && o.status === 'draft' ? 'Lanjut isi' : 'Cek hasil'}
              </Link>
              {isAdmin && o.status === 'draft' && (
                <button type="button" className="btn btn-sm btn-outline" onClick={() => doCancel(o.id, o.opname_number)}>
                  Batalkan
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="card">
            <div className="empty-state">
              Belum ada hitungan stok
              {isAdmin && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={startNew}>Mulai hitung stok</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
