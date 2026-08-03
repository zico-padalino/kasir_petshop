import { useMemo, useState } from 'react'
import { getCashDrawer, getCashMovements, cashIn, cashOut } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rupiah, dateTimeShort } from '../utils/format'
import RupiahInput from '../components/RupiahInput'

const TYPE_LABEL = {
  cash_in: { label: 'Setor Masuk', badge: 'badge-success', sign: '+' },
  cash_out: { label: 'Tarik Keluar', badge: 'badge-danger', sign: '−' },
  sale_cash: { label: 'Penjualan Tunai', badge: 'badge-info', sign: '+' },
  hotel_cash: { label: 'Titip Hewan Tunai', badge: 'badge-warning', sign: '+' },
}

export default function CashDrawer() {
  const { user } = useAuth()
  const toast = useToast()
  const [reload, setReload] = useState(0)
  const drawer = useMemo(() => getCashDrawer(), [reload])
  const movements = useMemo(() => getCashMovements({ limit: 80 }), [reload])

  const [mode, setMode] = useState('in') // in | out
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!amount || amount <= 0) {
      toast.error('Isi nominal uang.')
      return
    }
    const res = mode === 'in'
      ? cashIn({ amount, note }, user)
      : cashOut({ amount, note }, user)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    setAmount(0)
    setNote('')
    setReload((r) => r + 1)
  }

  return (
    <>
      <h1 className="page-title">Uang Kasir</h1>
      <p style={{ margin: '-12px 0 16px', color: '#666', fontSize: 13 }}>
        Kelola uang di laci kasir. Pembayaran tunai otomatis menambah saldo.
      </p>

      <div className="cash-balance-card">
        <div className="cash-balance-label">Saldo uang kasir saat ini</div>
        <div className="cash-balance-value">{rupiah(drawer.balance)}</div>
        {drawer.updated_at && (
          <div className="cash-balance-meta">Terakhir update: {dateTimeShort(drawer.updated_at)}</div>
        )}
      </div>

      <div className="home-summary" style={{ marginBottom: 20 }}>
        <div className="home-summary-item">
          <div className="stat-value" style={{ fontSize: 16 }}>{rupiah(drawer.today.cash_in)}</div>
          <div className="stat-label">Setor hari ini</div>
        </div>
        <div className="home-summary-item">
          <div className="stat-value" style={{ fontSize: 16 }}>{rupiah(drawer.today.cash_out)}</div>
          <div className="stat-label">Tarik hari ini</div>
        </div>
        <div className="home-summary-item">
          <div className="stat-value" style={{ fontSize: 16 }}>{rupiah(drawer.today.sales)}</div>
          <div className="stat-label">Penjualan tunai</div>
        </div>
        <div className="home-summary-item">
          <div className="stat-value" style={{ fontSize: 16 }}>{rupiah(drawer.today.hotel)}</div>
          <div className="stat-label">Titip tunai</div>
        </div>
      </div>

      <div className="side-form-grid" style={{ gridTemplateColumns: '360px 1fr' }}>
        <div className="card">
          <div className="card-header"><span>Setor / Tarik Uang</span></div>
          <div className="card-body">
            <div className="discount-type-tabs" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={`discount-type-tab ${mode === 'in' ? 'active' : ''}`}
                onClick={() => setMode('in')}
              >
                Masukkan
              </button>
              <button
                type="button"
                className={`discount-type-tab ${mode === 'out' ? 'active' : ''}`}
                onClick={() => setMode('out')}
              >
                Keluarkan
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Nominal *</label>
                <RupiahInput value={amount} onChange={setAmount} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Keterangan</label>
                <input
                  type="text"
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={mode === 'in' ? 'Contoh: Modal pagi' : 'Contoh: Belanja plastik / setor bank'}
                />
              </div>
              <button
                type="submit"
                className={`btn ${mode === 'in' ? 'btn-success' : 'btn-danger'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <i className={`bi ${mode === 'in' ? 'bi-box-arrow-in-down' : 'bi-box-arrow-up'}`}></i>
                {mode === 'in' ? 'Masukkan ke Kasir' : 'Keluarkan dari Kasir'}
              </button>
            </form>
            <p style={{ fontSize: 12, color: '#888', marginTop: 12, marginBottom: 0 }}>
              Penjualan / titip hewan dengan metode <strong>Tunai</strong> otomatis menambah saldo kasir (nilai total, setelah kembalian).
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span>Riwayat Uang Kasir</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Jenis</th>
                    <th>Nominal</th>
                    <th>Saldo</th>
                    <th>Keterangan</th>
                    <th>Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>Belum ada pergerakan uang</td></tr>
                  ) : (
                    movements.map((m) => {
                      const meta = TYPE_LABEL[m.type] || { label: m.type, badge: 'badge-info', sign: '+' }
                      return (
                        <tr key={m.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{dateTimeShort(m.created_at)}</td>
                          <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                          <td style={{ fontWeight: 700, color: m.direction === 'out' ? '#dc3545' : '#28a745', whiteSpace: 'nowrap' }}>
                            {meta.sign} {rupiah(m.amount)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{rupiah(m.balance_after)}</td>
                          <td style={{ fontSize: 13 }}>
                            {m.note || '-'}
                            {m.reference ? <div style={{ color: '#888', fontSize: 11 }}>{m.reference}</div> : null}
                          </td>
                          <td style={{ fontSize: 13 }}>{m.user_name}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
