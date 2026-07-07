import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPosProducts, getCategories, checkout } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { rupiah, formatRupiah } from '../utils/format'

function productIcon(categoryName = '') {
  const n = categoryName.toLowerCase()
  if (n.includes('makanan')) return '🍖'
  if (n.includes('aksesoris')) return '🎀'
  if (n.includes('perawatan')) return '🧴'
  if (n.includes('mainan')) return '🎾'
  return '📦'
}

export default function Pos() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const categories = useMemo(() => getCategories(), [])
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const products = useMemo(
    () => getPosProducts({ search, categoryId }),
    [search, categoryId, reloadKey]
  )

  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [success, setSuccess] = useState(null)
  const cartRef = useRef(null)

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const total = Math.max(0, subtotal - (Number(discount) || 0))
  const count = cart.reduce((s, i) => s + i.qty, 0)

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === p.id)
      if (existing) {
        if (existing.qty >= p.stock) {
          alert('Stok tidak cukup!')
          return prev
        }
        return prev.map((i) => (i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, stock: p.stock, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== id) return i
          let qty = i.qty + delta
          if (qty > i.stock) {
            alert('Stok maksimum tercapai!')
            qty = i.stock
          }
          return { ...i, qty }
        })
        .filter((i) => i.qty > 0)
    )
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((i) => i.product_id !== id))
  }

  function clearCart() {
    if (cart.length && !confirm('Kosongkan keranjang?')) return
    setCart([])
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'F2' && cart.length) {
        e.preventDefault()
        setCheckoutOpen(true)
      }
      if (e.key === 'Escape') {
        setCheckoutOpen(false)
        setSuccess(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cart.length])

  function scrollToCart() {
    cartRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <h1 className="page-title">Kasir / POS</h1>

      <div className="pos-layout">
        <div>
          <div className="category-tabs">
            <button className={`category-tab ${!categoryId ? 'active' : ''}`} onClick={() => setCategoryId('')}>Semua</button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`category-tab ${categoryId === c.id ? 'active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="search-bar">
            <input
              type="text"
              className="form-control"
              placeholder="Cari produk / SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {products.length ? (
            <div className="product-grid">
              {products.map((p) => (
                <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                  <div className="product-icon">{productIcon(p.category_name)}</div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-price">{rupiah(p.price)}</div>
                  <div className="product-stock">Stok: {p.stock} · {p.sku}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card"><div className="empty-state"><i className="bi bi-inbox"></i>Tidak ada produk ditemukan</div></div>
          )}
        </div>

        <div className="cart-panel" ref={cartRef}>
          <div className="cart-header">
            <span><i className="bi bi-cart3"></i> Keranjang ({count} item)</span>
            {cart.length > 0 && (
              <button className="btn btn-sm btn-outline" onClick={clearCart}>
                <i className="bi bi-trash"></i> Kosongkan
              </button>
            )}
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <i className="bi bi-cart"></i>Keranjang kosong<br /><small>Klik produk untuk menambahkan</small>
              </div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.product_id}>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">
                      {formatRupiah(item.price)} × {item.qty} = {formatRupiah(item.price * item.qty)}
                    </div>
                  </div>
                  <div className="cart-qty">
                    <button onClick={() => changeQty(item.product_id, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => changeQty(item.product_id, 1)}>+</button>
                    <button onClick={() => removeFromCart(item.product_id)} style={{ color: '#dc3545', marginLeft: 4 }} title="Hapus">×</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span>Subtotal</span><span>{rupiah(subtotal)}</span>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Diskon (Rp)</label>
              <input type="number" className="form-control" value={discount} min="0" onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="cart-total"><span>Total</span><span>{rupiah(total)}</span></div>
            <button
              className="btn btn-success"
              style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 8 }}
              onClick={() => setCheckoutOpen(true)}
              disabled={!cart.length}
            >
              <i className="bi bi-credit-card"></i> Bayar (F2)
            </button>
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <button className="fab-cart" onClick={scrollToCart} style={{ display: 'flex' }}>
          <i className="bi bi-cart3"></i> {count} · {rupiah(total)}
        </button>
      )}

      {checkoutOpen && (
        <CheckoutModal
          total={total}
          discount={Number(discount) || 0}
          cart={cart}
          user={user}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(res) => {
            setCheckoutOpen(false)
            setSuccess(res)
          }}
        />
      )}

      {success && (
        <div className="modal-overlay show">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: '#28a745' }}>Transaksi Berhasil!</h3>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{success.invoice_number}</p>
            <p style={{ fontSize: 20, color: 'var(--primary)' }}>{rupiah(success.total)}</p>
            {success.change_amount !== null && (
              <p style={{ fontSize: 14, color: '#666' }}>Kembalian: {rupiah(success.change_amount)}</p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/transactions/${success.transaction_id}/receipt`)}>
                <i className="bi bi-printer"></i> Cetak Struk
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSuccess(null)
                  setCart([])
                  setDiscount(0)
                  setReloadKey((k) => k + 1)
                }}
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CheckoutModal({ total, discount, cart, user, onClose, onSuccess }) {
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState(Math.ceil(total / 1000) * 1000 || 0)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const change = Math.max(0, (Number(cashReceived) || 0) - total)

  function process() {
    setProcessing(true)
    const res = checkout(
      {
        items: cart.map((i) => ({ product_id: i.product_id, qty: i.qty })),
        discount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? Number(cashReceived) : null,
        customer_name: customerName,
        notes,
      },
      user
    )
    setProcessing(false)
    if (res.success) onSuccess(res)
    else alert(res.message || 'Transaksi gagal')
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h3 style={{ marginTop: 0 }}><i className="bi bi-credit-card"></i> Checkout</h3>
        <div className="form-group">
          <label className="form-label">Nama Pelanggan (opsional)</label>
          <input type="text" className="form-control" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan" />
        </div>
        <div className="form-group">
          <label className="form-label">Metode Pembayaran</label>
          <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">💵 Tunai</option>
            <option value="transfer">🏦 Transfer</option>
            <option value="qris">📱 QRIS</option>
          </select>
        </div>
        {paymentMethod === 'cash' && (
          <div className="form-group">
            <label className="form-label">Uang Diterima (Rp)</label>
            <div className="quick-cash">
              <button type="button" onClick={() => setCashReceived(50000)}>50rb</button>
              <button type="button" onClick={() => setCashReceived(100000)}>100rb</button>
              <button type="button" onClick={() => setCashReceived(200000)}>200rb</button>
              <button type="button" onClick={() => setCashReceived(total)}>Pas</button>
            </div>
            <input type="number" className="form-control" min="0" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
            <div style={{ marginTop: 8, fontSize: 14 }}>Kembalian: <strong>{rupiah(change)}</strong></div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <textarea className="form-control" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Batal</button>
          <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={process} disabled={processing}>
            <i className="bi bi-check-lg"></i> {processing ? 'Memproses...' : 'Proses Bayar'}
          </button>
        </div>
      </div>
    </div>
  )
}
