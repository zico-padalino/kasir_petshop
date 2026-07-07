import { useState, useMemo } from 'react'
import { getReport, getBookkeeping } from '../db/store'
import { rupiah, dateShort, dateTimeShort, todayInput, monthStartInput } from '../utils/format'

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(monthStartInput())
  const [dateTo, setDateTo] = useState(todayInput())
  const [applied, setApplied] = useState({ dateFrom: monthStartInput(), dateTo: todayInput() })

  const { summary, byPayment, byCashier, topProducts, dailySales } = useMemo(
    () => getReport(applied),
    [applied]
  )
  const { days, totals } = useMemo(() => getBookkeeping(applied), [applied])

  function apply(e) {
    e.preventDefault()
    setApplied({ dateFrom, dateTo })
  }

  function exportCsv() {
    const rows = [['Tanggal', 'No. Invoice', 'Keterangan', 'Kasir', 'Metode', 'Jumlah Item', 'Subtotal', 'Diskon', 'Pemasukan', 'Saldo']]
    days.forEach((g) => {
      g.entries.forEach((e) => {
        rows.push([
          dateTimeShort(e.created_at),
          e.invoice_number,
          e.customer_name || 'Penjualan umum',
          e.cashier_name || '-',
          e.payment_method.toUpperCase(),
          e.item_qty,
          e.subtotal,
          e.discount,
          e.total,
          e.saldo,
        ])
      })
      rows.push([`Subtotal ${dateShort(g.date + ' 00:00:00')}`, '', '', '', '', '', g.subtotal, g.discount, g.revenue, ''])
    })
    rows.push(['TOTAL', '', '', '', '', '', totals.subtotal, totals.discount, totals.revenue, ''])

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rekap-pembukuan_${applied.dateFrom}_sd_${applied.dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Kop hanya tampil saat dicetak */}
      <div className="print-header">
        <h2>🐾 PetShop Dzikra — Rekapan Pembukuan</h2>
        <p>Jl. Pet Shop No. 1, Indonesia · Telp: 0812-3456-7890</p>
        <p>Periode: {dateShort(applied.dateFrom + ' 00:00:00')} s/d {dateShort(applied.dateTo + ' 00:00:00')}</p>
      </div>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Laporan Penjualan</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={exportCsv}><i className="bi bi-filetype-csv"></i> Unduh CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}><i className="bi bi-printer"></i> Cetak Rekap</button>
        </div>
      </div>
      <div className="no-print" style={{ height: 20 }} />

      <div className="card no-print" style={{ marginBottom: 20 }}>
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
          <div className="stat-info"><div className="stat-value">{rupiah(summary.total_revenue)}</div><div className="stat-label">Total Pemasukan</div></div>
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

      {/* ===== REKAPAN PEMBUKUAN (BUKU KAS) ===== */}
      <div className="card">
        <div className="card-header">
          <span><i className="bi bi-journal-text"></i> Rekapan Pembukuan (Buku Kas)</span>
          <span className="no-print" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>
            {dateShort(applied.dateFrom + ' 00:00:00')} — {dateShort(applied.dateTo + ' 00:00:00')}
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {totals.count ? (
            <div className="table-responsive">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="num">No</th>
                    <th>Waktu</th>
                    <th>No. Invoice</th>
                    <th>Keterangan</th>
                    <th>Kasir</th>
                    <th>Metode</th>
                    <th className="num">Item</th>
                    <th className="num">Subtotal</th>
                    <th className="num">Diskon</th>
                    <th className="num">Pemasukan</th>
                    <th className="num">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((g) => (
                    <FragmentDay key={g.date} g={g} />
                  ))}
                  <tr className="grand-total">
                    <td colSpan="7">TOTAL KESELURUHAN ({totals.count} transaksi)</td>
                    <td className="num">{rupiah(totals.subtotal)}</td>
                    <td className="num">{rupiah(totals.discount)}</td>
                    <td className="num">{rupiah(totals.revenue)}</td>
                    <td className="num">{rupiah(totals.revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><i className="bi bi-journal-x"></i>Belum ada transaksi pada periode ini</div>
          )}
        </div>
      </div>

      <div className="grid-2 no-print">
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

      <div className="grid-2 no-print" style={{ marginTop: 20 }}>
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

function FragmentDay({ g }) {
  return (
    <>
      <tr className="day-header">
        <td colSpan="11"><i className="bi bi-calendar-day"></i> {dateShort(g.date + ' 00:00:00')} — {g.count} transaksi</td>
      </tr>
      {g.entries.map((e) => (
        <tr key={e.id}>
          <td className="num">{e.no}</td>
          <td>{dateTimeShort(e.created_at)}</td>
          <td>{e.invoice_number}</td>
          <td>{e.customer_name || 'Penjualan umum'}{e.notes ? ` — ${e.notes}` : ''}</td>
          <td>{e.cashier_name || '-'}</td>
          <td><span className="badge badge-info">{e.payment_method.toUpperCase()}</span></td>
          <td className="num">{e.item_qty}</td>
          <td className="num">{rupiah(e.subtotal)}</td>
          <td className="num">{e.discount ? rupiah(e.discount) : '-'}</td>
          <td className="num">{rupiah(e.total)}</td>
          <td className="num">{rupiah(e.saldo)}</td>
        </tr>
      ))}
      <tr className="day-subtotal">
        <td colSpan="7">Subtotal {dateShort(g.date + ' 00:00:00')}</td>
        <td className="num">{rupiah(g.subtotal)}</td>
        <td className="num">{rupiah(g.discount)}</td>
        <td className="num">{rupiah(g.revenue)}</td>
        <td className="num"></td>
      </tr>
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
