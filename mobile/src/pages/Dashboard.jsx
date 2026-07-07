import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../db/store'
import { rupiah, dateTimeShort } from '../utils/format'

export default function Dashboard() {
  const { stats, lowStock, topProducts, recentTransactions } = useMemo(() => getDashboardStats(), [])

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="bi bi-box-seam"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_products}</div>
            <div className="stat-label">Total Produk Aktif</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="bi bi-stack"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_stock.toLocaleString('id-ID')}</div>
            <div className="stat-label">Total Stok Barang</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="bi bi-receipt"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.today_transactions}</div>
            <div className="stat-label">Transaksi Hari Ini</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><i className="bi bi-currency-dollar"></i></div>
          <div className="stat-info">
            <div className="stat-value">{rupiah(stats.today_revenue)}</div>
            <div className="stat-label">Pendapatan Hari Ini</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span><i className="bi bi-exclamation-triangle"></i> Stok Menipis</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {lowStock.length ? (
              <table className="data-table">
                <thead><tr><th>Produk</th><th>SKU</th><th>Stok</th></tr></thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.sku}</td>
                      <td><span className="badge badge-warning">{item.stock}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><i className="bi bi-check-circle"></i>Semua stok aman</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span><i className="bi bi-fire"></i> Produk Terlaris Hari Ini</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {topProducts.length ? (
              <table className="data-table">
                <thead><tr><th>Produk</th><th>Terjual</th><th>Pendapatan</th></tr></thead>
                <tbody>
                  {topProducts.map((item, i) => (
                    <tr key={i}>
                      <td>{item.product_name}</td>
                      <td>{item.total_sold} pcs</td>
                      <td>{rupiah(item.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><i className="bi bi-cart"></i>Belum ada penjualan hari ini</div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span><i className="bi bi-clock-history"></i> Transaksi Terbaru</span>
          <Link to="/transactions" className="btn btn-sm btn-outline">Lihat Semua</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentTransactions.length ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr><th>Invoice</th><th>Kasir</th><th>Total</th><th>Metode</th><th>Waktu</th></tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td><Link to={`/transactions/${tx.id}`} style={{ color: 'var(--primary)' }}>{tx.invoice_number}</Link></td>
                      <td>{tx.cashier_name ?? '-'}</td>
                      <td>{rupiah(tx.total)}</td>
                      <td><span className="badge badge-info">{tx.payment_method.toUpperCase()}</span></td>
                      <td>{dateTimeShort(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><i className="bi bi-receipt"></i>Belum ada transaksi</div>
          )}
        </div>
      </div>
    </>
  )
}
