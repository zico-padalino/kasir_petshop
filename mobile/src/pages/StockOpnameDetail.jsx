import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getStockOpname,
  saveStockOpnameItems,
  completeStockOpname,
  cancelStockOpname,
} from '../db/store'
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

function diffInfo(diff) {
  if (diff === 0) {
    return {
      kind: 'ok',
      label: 'Cocok',
      emoji: '✅',
      explain: 'Hitungan sama dengan sistem',
      className: 'op-item-ok',
    }
  }
  if (diff > 0) {
    return {
      kind: 'plus',
      label: `Lebih ${diff}`,
      emoji: '⬆️',
      explain: `Barang fisik lebih banyak ${diff} dari catatan komputer`,
      className: 'op-item-plus',
    }
  }
  return {
    kind: 'minus',
    label: `Kurang ${Math.abs(diff)}`,
    emoji: '⬇️',
    explain: `Barang fisik kurang ${Math.abs(diff)} dari catatan komputer`,
    className: 'op-item-minus',
  }
}

export default function StockOpnameDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const isAdmin = can('admin')
  const toast = useToast()
  const navigate = useNavigate()
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const result = useMemo(() => getStockOpname(id), [id, reload])
  const [rows, setRows] = useState([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (result.ok) {
      setRows(result.items.map((i) => ({ ...i })))
      setNotes(result.opname.notes || '')
    }
  }, [result])

  if (!result.ok) {
    return (
      <>
        <h1 className="page-title">Cek Stok Opname</h1>
        <div className="card"><div className="empty-state">{result.message}</div></div>
        <Link to="/stock-opname" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
      </>
    )
  }

  const { opname } = result
  const canEdit = isAdmin && opname.status === 'draft'

  function setPhysical(itemId, value) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== itemId) return r
        const physical_stock = Math.max(0, Number(value) || 0)
        return { ...r, physical_stock, difference: physical_stock - r.system_stock }
      })
    )
  }

  function bump(itemId, delta) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== itemId) return r
        const physical_stock = Math.max(0, (Number(r.physical_stock) || 0) + delta)
        return { ...r, physical_stock, difference: physical_stock - r.system_stock }
      })
    )
  }

  function setItemNote(itemId, value) {
    setRows((prev) => prev.map((r) => (r.id === itemId ? { ...r, notes: value } : r)))
  }

  const filtered = rows.filter((r) => {
    if (filter === 'diff' && r.difference === 0) return false
    if (filter === 'match' && r.difference !== 0) return false
    if (filter === 'minus' && r.difference >= 0) return false
    if (filter === 'plus' && r.difference <= 0) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.product_name.toLowerCase().includes(q) && !r.sku.toLowerCase().includes(q)) return false
    }
    return true
  })

  const summary = {
    total: rows.length,
    match: rows.filter((r) => r.difference === 0).length,
    plus: rows.filter((r) => r.difference > 0).length,
    minus: rows.filter((r) => r.difference < 0).length,
  }

  function saveDraft() {
    const res = saveStockOpnameItems(id, rows, notes)
    if (res.ok) {
      toast.success(res.message)
      setReload((x) => x + 1)
    } else toast.error(res.message)
  }

  function finish() {
    if (!confirm('Selesai hitung stok?\n\nCatatan di komputer akan diganti sesuai hitungan fisik. Owner bisa melihat hasilnya.')) return
    const res = completeStockOpname(id, rows, notes)
    if (res.ok) {
      toast.success(res.message)
      setReload((x) => x + 1)
    } else toast.error(res.message)
  }

  function doCancel() {
    if (!confirm('Batalkan hitungan ini?')) return
    const res = cancelStockOpname(id)
    if (res.ok) {
      toast.success(res.message)
      navigate('/stock-opname')
    } else toast.error(res.message)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Hitung stok barang</h1>
          <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
            No. {opname.opname_number}
            {' · '}<span className={`badge ${STATUS_BADGE[opname.status]}`}>{STATUS_LABEL[opname.status]}</span>
            {' · '}oleh {opname.cashier_name}
          </p>
          <p style={{ margin: '4px 0 0', color: '#999', fontSize: 12 }}>
            Dibuat {dateTimeShort(opname.created_at)}
            {opname.completed_at && <> · Selesai {dateTimeShort(opname.completed_at)}</>}
          </p>
        </div>
        <Link to="/stock-opname" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
      </div>
      <div style={{ height: 14 }} />

      {/* Legenda warna — supaya awam paham */}
      <div className="op-legend">
        <div className="op-legend-item op-legend-ok"><span>✅</span> Hijau = cocok (sama)</div>
        <div className="op-legend-item op-legend-plus"><span>⬆️</span> Biru = lebih banyak di toko</div>
        <div className="op-legend-item op-legend-minus"><span>⬇️</span> Merah = kurang di toko</div>
      </div>

      {canEdit && (
        <div className="home-tip" style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Langkah mudah:</strong> 1) Lihat angka “Di komputer”. 2) Hitung barang di rak. 3) Isi “Dihitung di toko” (bisa pakai tombol + / −). 4) Ketuk <em>Selesai & simpan stok</em>.
        </div>
      )}
      {!canEdit && !isAdmin && (
        <div className="home-tip" style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Mode Owner:</strong> Anda hanya melihat hasil. Fokus ke barang berwarna merah/biru — itu yang selisih.
        </div>
      )}

      {/* Ringkasan klikable sebagai filter */}
      <div className="op-summary">
        <button type="button" className={`op-summary-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <strong>{summary.total}</strong>
          <span>Semua</span>
        </button>
        <button type="button" className={`op-summary-btn ok ${filter === 'match' ? 'active' : ''}`} onClick={() => setFilter('match')}>
          <strong>{summary.match}</strong>
          <span>✅ Cocok</span>
        </button>
        <button type="button" className={`op-summary-btn plus ${filter === 'plus' ? 'active' : ''}`} onClick={() => setFilter('plus')}>
          <strong>{summary.plus}</strong>
          <span>⬆️ Lebih</span>
        </button>
        <button type="button" className={`op-summary-btn minus ${filter === 'minus' ? 'active' : ''}`} onClick={() => setFilter('minus')}>
          <strong>{summary.minus}</strong>
          <span>⬇️ Kurang</span>
        </button>
      </div>

      <div className="op-toolbar">
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className={`btn btn-sm ${filter === 'diff' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter(filter === 'diff' ? 'all' : 'diff')}
        >
          Hanya yang selisih
        </button>
      </div>

      {/* Kartu barang — lebih mudah dibaca daripada tabel padat */}
      <div className="op-list">
        {filtered.length ? filtered.map((r) => {
          const info = diffInfo(r.difference)
          return (
            <div key={r.id} className={`op-item ${info.className}`}>
              <div className="op-item-head">
                <div>
                  <div className="op-item-name">{r.product_name}</div>
                  <div className="op-item-sku">Kode: {r.sku}</div>
                </div>
                <div className={`op-status-pill op-status-${info.kind}`}>
                  {info.emoji} {info.label}
                </div>
              </div>

              <div className="op-item-nums">
                <div className="op-num">
                  <div className="op-num-label">💻 Di komputer</div>
                  <div className="op-num-value">{r.system_stock}</div>
                </div>
                <div className="op-num-arrow">→</div>
                <div className="op-num">
                  <div className="op-num-label">🛒 Dihitung di toko</div>
                  {canEdit ? (
                    <div className="op-stepper">
                      <button type="button" className="op-step-btn" onClick={() => bump(r.id, -1)} aria-label="Kurangi">−</button>
                      <input
                        type="number"
                        min="0"
                        className="op-step-input"
                        value={r.physical_stock}
                        onChange={(e) => setPhysical(r.id, e.target.value)}
                      />
                      <button type="button" className="op-step-btn" onClick={() => bump(r.id, 1)} aria-label="Tambah">+</button>
                    </div>
                  ) : (
                    <div className="op-num-value">{r.physical_stock}</div>
                  )}
                </div>
              </div>

              <div className="op-item-explain">{info.explain}</div>

              {canEdit ? (
                <input
                  type="text"
                  className="form-control op-note-input"
                  placeholder="Catatan (opsional), contoh: rusak / belum masuk"
                  value={r.notes || ''}
                  onChange={(e) => setItemNote(r.id, e.target.value)}
                />
              ) : (
                r.notes && <div className="op-item-note">📝 {r.notes}</div>
              )}
            </div>
          )
        }) : (
          <div className="card"><div className="empty-state">Tidak ada barang pada filter ini</div></div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">Catatan keseluruhan</div>
        <div className="card-body">
          {canEdit ? (
            <textarea
              className="form-control"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Opname akhir bulan, rak gudang utama"
            />
          ) : (
            <p style={{ margin: 0 }}>{notes || 'Tidak ada catatan'}</p>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="op-actions">
          <button type="button" className="btn btn-outline" onClick={saveDraft}>
            <i className="bi bi-save"></i> Simpan dulu
          </button>
          <button type="button" className="btn btn-success" onClick={finish}>
            <i className="bi bi-check-lg"></i> Selesai & simpan stok
          </button>
          <button type="button" className="btn btn-danger" onClick={doCancel}>
            <i className="bi bi-x-lg"></i> Batalkan
          </button>
        </div>
      )}
    </>
  )
}
