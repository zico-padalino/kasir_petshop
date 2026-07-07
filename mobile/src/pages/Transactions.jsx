import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getTransactions } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { rupiah, dateTimeShort } from '../utils/format'

export default function Transactions() {
  const { user } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState({ dateFrom: '', dateTo: '', search: '' })

  const { transactions, summary } = useMemo(
    () => getTransactions(applied, user),
    [applied, user]
  )

  function applyFilter(e) {
    e.preventDefault()
    setApplied({ dateFrom, dateTo, search })
  }

  function reset() {
    setDateFrom(''); setDateTo(''); setSearch('')
    setApplied({ dateFrom: '', dateTo: '', search: '' })
  }

  return (
    <>
      <h1 className="page-title">Riwayat Transaksi</h1>

      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 500 }}>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="bi bi-receipt"></i></div>
          <div className="stat-info">
            <div className="stat-value">{summary.total_count}</div>
            <div className="stat-label">Total Transaksi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><i className="bi bi-currency-dollar"></i></div>
          <div className="stat-info">
            <div className="stat-value">{rupiah(summary.total_revenue)}</div>
            <div className="stat-label">Total Pendapatan</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span>Daftar Transaksi</span></div>
        <div className="card-body">
          <form className="search-bar" onSubmit={applyFilter}>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} />
            <span style={{ alignSelf: 'center', color: '#666' }}>s/d</span>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} />
            <input type="text" className="form-control" placeholder="Cari invoice / pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
            <button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-funnel"></i> Filter</button>
            <button type="button" onClick={reset} className="btn btn-outline btn-sm">Reset</button>
          </form>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Kasir</th><th>Pelanggan</th><th>Total</th><th>Bayar</th><th>Waktu</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length ? transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td><strong>{tx.invoice_number}</strong></td>
                    <td>{tx.cashier_name ?? '-'}</td>
                    <td>{tx.customer_name ?? '-'}</td>
                    <td>{rupiah(tx.total)}</td>
                    <td><span className="badge badge-info">{tx.payment_method.toUpperCase()}</span></td>
                    <td>{dateTimeShort(tx.created_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/transactions/${tx.id}`} className="btn btn-sm btn-outline" title="Detail"><i className="bi bi-eye"></i></Link>{' '}
                      <Link to={`/transactions/${tx.id}/receipt`} className="btn btn-sm btn-primary" title="Cetak Struk"><i className="bi bi-printer"></i></Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" className="empty-state">Tidak ada transaksi pada periode ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
