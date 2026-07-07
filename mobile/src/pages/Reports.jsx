import { useState, useMemo } from 'react'
import { getReport } from '../db/store'
import { rupiah, dateShort, todayInput, monthStartInput } from '../utils/format'

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(monthStartInput())
  const [dateTo, setDateTo] = useState(todayInput())
  const [applied, setApplied] = useState({ dateFrom: monthStartInput(), dateTo: todayInput() })

  const { summary, byPayment, byCashier, topProducts, dailySales } = useMemo(
    () => getReport(applied),
    [applied]
  )

  function apply(e) {
    e.preventDefault()
    setApplied({ dateFrom, dateTo })
  }

  return (
    <>
      <h1 className="page-title">Laporan Penjualan</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <form className="search-bar" onSubmit={apply}>
            <label className="form-label" style={{ margin: 0, alignSelf: 'center' }}>Periode:</label>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} />
            <span style={{ alignSelf: 'center', color: '#666' }}>s/d</span>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} />
            <button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-funnel"></i> Tampilkan</button>
          </form>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><i className="bi bi-receipt"></i></div>
          <div className="stat-info"><div className="stat-value">{summary.total_transactions}</div><div className="stat-label">Total Transaksi</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><i className="bi bi-currency-dollar"></i></div>
          <div className="stat-info"><div className="stat-value">{rupiah(summary.total_revenue)}</div><div className="stat-label">Total Pendapatan</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="bi bi-percent"></i></div>
          <div className="stat-info"><div className="stat-value">{rupiah(summary.total_discount)}</div><div className="stat-label">Total Diskon</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><i className="bi bi-graph-up"></i></div>
          <div className="stat-info"><div className="stat-value">{rupiah(summary.avg_transaction)}</div><div className="stat-label">Rata-rata Transaksi</div></div>
        </div>
      </div>

      <div className="grid-2">
        <ReportCard title={<><i className="bi bi-credit-card"></i> Pendapatan per Metode Bayar</>} empty={!byPayment.length} emptyIcon="bi-inbox" emptyText="Belum ada data" head={['Metode', 'Jumlah', 'Total']}>
          {byPayment.map((row, i) => (
            <tr key={i}>
              <td><span className="badge badge-info">{row.payment_method.toUpperCase()}</span></td>
              <td>{row.total_count}x</td>
              <td>{rupiah(row.total_amount)}</td>
            </tr>
          ))}
        </ReportCard>

        <ReportCard title={<><i className="bi bi-person"></i> Performa Kasir</>} empty={!byCashier.length} emptyIcon="bi-inbox" emptyText="Belum ada data" head={['Kasir', 'Transaksi', 'Total']}>
          {byCashier.map((row, i) => (
            <tr key={i}>
              <td>{row.cashier_name ?? 'Unknown'}</td>
              <td>{row.total_count}x</td>
              <td>{rupiah(row.total_revenue)}</td>
            </tr>
          ))}
        </ReportCard>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <ReportCard title={<><i className="bi bi-fire"></i> 10 Produk Terlaris</>} empty={!topProducts.length} emptyIcon="bi-cart" emptyText="Belum ada penjualan" head={['#', 'Produk', 'Terjual', 'Pendapatan']}>
          {topProducts.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{row.product_name}</td>
              <td>{row.total_qty} pcs</td>
              <td>{rupiah(row.total_revenue)}</td>
            </tr>
          ))}
        </ReportCard>

        <ReportCard title={<><i className="bi bi-calendar3"></i> Penjualan Harian</>} empty={!dailySales.length} emptyIcon="bi-calendar" emptyText="Belum ada data" head={['Tanggal', 'Transaksi', 'Pendapatan']}>
          {dailySales.map((row, i) => (
            <tr key={i}>
              <td>{dateShort(row.sale_date)}</td>
              <td>{row.total_count}x</td>
              <td>{rupiah(row.total_revenue)}</td>
            </tr>
          ))}
        </ReportCard>
      </div>
    </>
  )
}

function ReportCard({ title, head, children, empty, emptyIcon, emptyText }) {
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <div className="card-body" style={{ padding: 0 }}>
        {empty ? (
          <div className="empty-state"><i className={`bi ${emptyIcon}`}></i>{emptyText}</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{children}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
