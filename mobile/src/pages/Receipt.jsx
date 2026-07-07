import { useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTransaction } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { rupiah, dateTimeShort } from '../utils/format'

const wrapStyle = {
  fontFamily: "'Courier New', monospace",
  fontSize: 12,
  width: 280,
  margin: '0 auto',
  padding: 16,
  color: '#000',
  background: '#fff',
  minHeight: '100vh',
}

export default function Receipt() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const result = useMemo(() => getTransaction(id, user), [id, user])

  useEffect(() => {
    document.body.style.background = '#fff'
    return () => { document.body.style.background = '' }
  }, [])

  if (!result.ok) {
    return <div style={wrapStyle}>{result.message}</div>
  }

  const { transaction: t, items } = result
  const line = { borderTop: '1px dashed #000', margin: '8px 0' }
  const td = { padding: '2px 0', verticalAlign: 'top' }
  const right = { ...td, textAlign: 'right' }

  return (
    <div style={wrapStyle}>
      <style>{`@media print { .no-print { display: none !important; } body { background:#fff; } }`}</style>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>🐾 PetShop Dzikra</div>
      <div style={{ textAlign: 'center', fontSize: 11, margin: '4px 0' }}>Jl. Pet Shop No. 1, Indonesia</div>
      <div style={{ textAlign: 'center', fontSize: 11 }}>Telp: 0812-3456-7890</div>
      <div style={line}></div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={td}>No. Invoice</td><td style={right}>{t.invoice_number}</td></tr>
          <tr><td style={td}>Tanggal</td><td style={right}>{dateTimeShort(t.created_at)}</td></tr>
          <tr><td style={td}>Kasir</td><td style={right}>{t.cashier_name ?? '-'}</td></tr>
          {t.customer_name && <tr><td style={td}>Pelanggan</td><td style={right}>{t.customer_name}</td></tr>}
        </tbody>
      </table>

      <div style={line}></div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ verticalAlign: 'top' }}>
              <td style={td} colSpan="2">
                {item.product_name}
                <div>&nbsp;&nbsp;{item.qty} x {rupiah(item.price)}</div>
              </td>
              <td style={{ ...right, verticalAlign: 'bottom' }}>{rupiah(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={line}></div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={td}>Subtotal</td><td style={right}>{rupiah(t.subtotal)}</td></tr>
          {t.discount > 0 && <tr><td style={td}>Diskon</td><td style={right}>- {rupiah(t.discount)}</td></tr>}
          <tr style={{ fontWeight: 'bold' }}><td style={td}>TOTAL</td><td style={right}>{rupiah(t.total)}</td></tr>
          <tr>
            <td style={td}>Bayar ({t.payment_method.toUpperCase()})</td>
            <td style={right}>{t.payment_method === 'cash' ? rupiah(t.cash_received) : rupiah(t.total)}</td>
          </tr>
          {t.payment_method === 'cash' && t.change_amount > 0 && (
            <tr><td style={td}>Kembalian</td><td style={right}>{rupiah(t.change_amount)}</td></tr>
          )}
        </tbody>
      </table>

      <div style={line}></div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>Terima kasih atas kunjungan Anda!</div>
      <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>Barang yang sudah dibeli tidak dapat ditukar</div>

      <div className="no-print" style={{ textAlign: 'center', marginTop: 20 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 24px', cursor: 'pointer', fontSize: 14 }}>🖨️ Cetak Struk</button>
        <br /><br />
        <button onClick={() => navigate('/pos')} style={{ fontSize: 12, background: 'none', border: 'none', color: '#17a2b8', cursor: 'pointer' }}>← Kembali ke Kasir</button>
      </div>
    </div>
  )
}
