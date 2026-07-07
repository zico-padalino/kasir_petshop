import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTransaction } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { rupiah, dateLong } from '../utils/format'

export default function TransactionDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const result = useMemo(() => getTransaction(id, user), [id, user])

  if (!result.ok) {
    return (
      <>
        <h1 className="page-title">Detail Transaksi</h1>
        <div className="card"><div className="empty-state"><i className="bi bi-exclamation-circle"></i>{result.message}</div></div>
        <Link to="/transactions" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
      </>
    )
  }

  const { transaction, items } = result

  return (
    <>
      <h1 className="page-title">Detail Transaksi</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Link to="/transactions" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
        <Link to={`/transactions/${transaction.id}/receipt`} className="btn btn-primary btn-sm"><i className="bi bi-printer"></i> Cetak Struk</Link>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">Informasi Transaksi</div>
          <div className="card-body">
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Invoice</td><td><strong>{transaction.invoice_number}</strong></td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Kasir</td><td>{transaction.cashier_name ?? '-'}</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Pelanggan</td><td>{transaction.customer_name ?? '-'}</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Metode Bayar</td><td><span className="badge badge-info">{transaction.payment_method.toUpperCase()}</span></td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Waktu</td><td>{dateLong(transaction.created_at)}</td></tr>
                {transaction.notes && (
                  <tr><td style={{ padding: '6px 0', color: '#666' }}>Catatan</td><td>{transaction.notes}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Ringkasan Pembayaran</div>
          <div className="card-body">
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Subtotal</td><td style={{ textAlign: 'right' }}>{rupiah(transaction.subtotal)}</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Diskon</td><td style={{ textAlign: 'right' }}>{rupiah(transaction.discount)}</td></tr>
                <tr style={{ fontSize: 18, fontWeight: 700, borderTop: '2px solid #eee' }}>
                  <td style={{ padding: '10px 0' }}>Total</td>
                  <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{rupiah(transaction.total)}</td>
                </tr>
                {transaction.payment_method === 'cash' && (
                  <>
                    <tr><td style={{ padding: '6px 0', color: '#666' }}>Uang Diterima</td><td style={{ textAlign: 'right' }}>{rupiah(transaction.cash_received)}</td></tr>
                    <tr><td style={{ padding: '6px 0', color: '#666' }}>Kembalian</td><td style={{ textAlign: 'right' }}>{rupiah(transaction.change_amount)}</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">Item Transaksi</div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{rupiah(item.price)}</td>
                    <td>{item.qty}</td>
                    <td>{rupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
