import { useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTransaction, getShopSettings } from '../db/store'
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
  const shop = useMemo(() => getShopSettings(), [])

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
  const title = shop.receipt_name || shop.shop_name || 'Toko'

  return (
    <div style={wrapStyle}>
      <style>{`@media print { .no-print { display: none !important; } body { background:#fff; } }`}</style>
      {shop.logo ? (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img src={shop.logo} alt="" style={{ maxWidth: 120, maxHeight: 72, objectFit: 'contain' }} />
        </div>
      ) : null}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
        {shop.logo ? title : `🐾 ${title}`}
      </div>
      {shop.address && (
        <div style={{ textAlign: 'center', fontSize: 11, margin: '4px 0', whiteSpace: 'pre-wrap' }}>{shop.address}</div>
      )}
      {shop.phone && (
        <div style={{ textAlign: 'center', fontSize: 11 }}>Telp: {shop.phone}</div>
      )}
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
      <div style={{ textAlign: 'center', marginTop: 8 }}>{shop.receipt_footer || 'Terima kasih atas kunjungan Anda!'}</div>
      {shop.receipt_note && (
        <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>{shop.receipt_note}</div>
      )}

      <div className="no-print" style={{ textAlign: 'center', marginTop: 20 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 24px', cursor: 'pointer', fontSize: 14 }}>🖨️ Cetak Struk</button>
        <br /><br />
        <button onClick={() => navigate('/pos')} style={{ fontSize: 12, background: 'none', border: 'none', color: '#17a2b8', cursor: 'pointer' }}>← Kembali ke Kasir</button>
      </div>
    </div>
  )
}
