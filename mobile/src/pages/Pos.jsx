import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPosProducts,
  getCategories,
  checkout,
  findProductByScan,
  getHeldOrders,
  holdOrder,
  resumeHeldOrder,
  transferHeldOrder,
  deleteHeldOrder,
} from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rupiah, formatRupiah, dateTimeShort, calcDiscountAmount } from '../utils/format'
import RupiahInput from '../components/RupiahInput'

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))

function productIcon(categoryName = '') {
  const n = categoryName.toLowerCase()
  if (n.includes('makanan')) return '🍖'
  if (n.includes('aksesoris')) return '🎀'
  if (n.includes('perawatan')) return '🧴'
  if (n.includes('mainan')) return '🎾'
  return '📦'
}

function beepOk() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 880
    g.gain.value = 0.08
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => {
      o.stop()
      ctx.close()
    }, 80)
  } catch { /* ignore */ }
}

export default function Pos() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const categories = useMemo(() => getCategories(), [])
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [heldKey, setHeldKey] = useState(0)

  const products = useMemo(
    () => getPosProducts({ search, categoryId }),
    [search, categoryId, reloadKey]
  )
  const heldOrders = useMemo(() => getHeldOrders(), [heldKey])

  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [discountType, setDiscountType] = useState('rp') // 'rp' | 'percent'
  const [discountValue, setDiscountValue] = useState(0)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [success, setSuccess] = useState(null)
  const [scanCode, setScanCode] = useState('')
  const [scanMsg, setScanMsg] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState(null)
  const [transferName, setTransferName] = useState('')
  const cartRef = useRef(null)
  const scanInputRef = useRef(null)

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmount = calcDiscountAmount(subtotal, discountValue, discountType)
  const total = Math.max(0, subtotal - discountAmount)
  const count = cart.reduce((s, i) => s + i.qty, 0)

  function addToCart(p, { fromScan = false } = {}) {
    let result = 'ok'
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === p.id)
      if (existing) {
        if (existing.qty >= p.stock) {
          result = 'stock'
          return prev
        }
        return prev.map((i) => (i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, stock: p.stock, qty: 1 }]
    })
    if (result === 'stock') {
      setScanMsg({ type: 'err', text: `Stok "${p.name}" tidak cukup` })
      return false
    }
    if (fromScan) {
      beepOk()
      setScanMsg({ type: 'ok', text: `+ ${p.name}` })
    }
    return true
  }

  function handleScan(raw) {
    const code = String(raw || '').trim()
    if (!code) return
    const res = findProductByScan(code)
    if (!res.ok) {
      setScanMsg({ type: 'err', text: res.message })
      return
    }
    addToCart(res.product, { fromScan: true })
    setScanCode('')
    requestAnimationFrame(() => scanInputRef.current?.focus())
  }

  function submitScan(e) {
    e.preventDefault()
    handleScan(scanCode)
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
    setDiscountValue(0)
    setDiscountType('rp')
  }

  function handleHold() {
    const res = holdOrder(
      {
        customer_name: customerName,
        items: cart,
        discount: discountAmount,
        discount_type: discountType,
        discount_value: discountValue,
      },
      user
    )
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    setCart([])
    setDiscountValue(0)
    setDiscountType('rp')
    setCustomerName('')
    setHeldKey((k) => k + 1)
    requestAnimationFrame(() => scanInputRef.current?.focus())
  }

  function handleResume(id) {
    if (cart.length) {
      if (!confirm('Keranjang masih berisi. Lanjutkan pesanan ditahan? Keranjang saat ini akan diganti.')) return
    }
    const res = resumeHeldOrder(id)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setCart(res.order.items)
    setDiscountType(res.order.discount_type === 'percent' ? 'percent' : 'rp')
    setDiscountValue(
      res.order.discount_value != null
        ? res.order.discount_value
        : (res.order.discount || 0)
    )
    setCustomerName(res.order.customer_name || '')
    setHeldKey((k) => k + 1)
    toast.success(res.message)
    scrollToCart()
  }

  function openTransfer(order) {
    setTransferTarget(order)
    setTransferName('')
  }

  function submitTransfer(e) {
    e.preventDefault()
    if (!transferTarget) return
    const res = transferHeldOrder(transferTarget.id, transferName, user)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    setTransferTarget(null)
    setTransferName('')
    setHeldKey((k) => k + 1)
  }

  function handleDeleteHeld(id) {
    if (!confirm('Buang pesanan ditahan ini?')) return
    const res = deleteHeldOrder(id, user)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setHeldKey((k) => k + 1)
  }

  useEffect(() => {
    if (!scanMsg) return
    const t = setTimeout(() => setScanMsg(null), 4500)
    return () => clearTimeout(t)
  }, [scanMsg])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'F2' && cart.length) {
        e.preventDefault()
        setCheckoutOpen(true)
      }
      if (e.key === 'F3') {
        e.preventDefault()
        scanInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setCheckoutOpen(false)
        setSuccess(null)
        setCameraOpen(false)
        setTransferTarget(null)
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
      <h1 className="page-title">Jual Barang</h1>
      <p style={{ margin: '-12px 0 16px', color: '#666', fontSize: 13 }}>
        Scan barcode / SKU, atau ketuk barang — tahan pesanan jika pelanggan belum bayar
      </p>

      {!window.isSecureContext && (
        <div className="alert-custom alert-danger" style={{ marginBottom: 12 }}>
          <div className="alert-body">
            <strong>Kamera tidak bisa dipakai di HTTP</strong>
            Buka URL HTTPS dari Cloudflare Tunnel (<code>Jalankan-Tunnel.bat</code>),
            bukan <code>http://IP:5173</code>. Browser HP memblokir kamera di koneksi tidak aman.
          </div>
        </div>
      )}

      <form className="scan-bar" onSubmit={submitScan}>
        <div className="scan-bar-icon"><i className="bi bi-upc-scan"></i></div>
        <input
          ref={scanInputRef}
          className="scan-input form-control"
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
          placeholder="Scan barcode / ketik SKU lalu Enter (F3)"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary">Cari</button>
        <button
          type="button"
          className="btn btn-outline"
          title="Scan kamera"
          onClick={() => setCameraOpen(true)}
          disabled={!window.isSecureContext}
        >
          <i className="bi bi-camera"></i>
        </button>
      </form>

      {scanMsg && (
        <div className={`alert-custom ${scanMsg.type === 'ok' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 12 }}>
          <div className="alert-body">{scanMsg.text}</div>
        </div>
      )}

      {heldOrders.length > 0 && (
        <div className="card held-orders-card">
          <div className="card-header">
            <span><i className="bi bi-pause-circle"></i> Pesanan Ditahan ({heldOrders.length})</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {heldOrders.map((o) => (
              <div className="held-order-row" key={o.id}>
                <div className="held-order-info">
                  <strong>{o.customer_name}</strong>
                  <div className="held-order-meta">
                    {o.item_count} item · {rupiah(o.total)}
                    {o.created_at ? ` · ${dateTimeShort(o.created_at)}` : ''}
                  </div>
                </div>
                <div className="held-order-actions">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => handleResume(o.id)} title="Lanjutkan">
                    <i className="bi bi-play-fill"></i> Lanjut
                  </button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => openTransfer(o)} title="Pindah ke pelanggan lain">
                    <i className="bi bi-arrow-left-right"></i> Pindah
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDeleteHeld(o.id)} title="Buang">
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pos-layout">
        <div>
          <div className="category-tabs">
            <button type="button" className={`category-tab ${!categoryId ? 'active' : ''}`} onClick={() => setCategoryId('')}>Semua</button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`category-tab ${String(categoryId) === String(c.id) ? 'active' : ''}`}
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
              placeholder="Cari nama / SKU / barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {products.length > 0 ? (
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
          <div className="cart-customer">
            <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Pelanggan aktif</label>
            <input
              type="text"
              className="form-control"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama pelanggan (wajib untuk tahan pesanan)"
            />
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <i className="bi bi-cart"></i>Keranjang kosong<br />
                <small>Scan barcode atau ketuk produk</small>
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
              <label className="form-label" style={{ fontSize: 12 }}>Diskon</label>
              <div className="discount-type-tabs">
                <button
                  type="button"
                  className={`discount-type-tab ${discountType === 'rp' ? 'active' : ''}`}
                  onClick={() => { setDiscountType('rp'); setDiscountValue(0) }}
                >
                  Rp
                </button>
                <button
                  type="button"
                  className={`discount-type-tab ${discountType === 'percent' ? 'active' : ''}`}
                  onClick={() => { setDiscountType('percent'); setDiscountValue(0) }}
                >
                  %
                </button>
              </div>
              {discountType === 'rp' ? (
                <RupiahInput value={discountValue} onChange={setDiscountValue} />
              ) : (
                <div className="rupiah-field">
                  <input
                    type="number"
                    className="form-control rupiah-field-input"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountValue || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : Number(e.target.value)
                      setDiscountValue(Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0)
                    }}
                  />
                  <span className="rupiah-field-prefix" style={{ borderLeft: '1px solid #ced4da', borderRight: 'none' }}>%</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  Potongan: − {rupiah(discountAmount)}
                  {discountType === 'percent' ? ` (${discountValue}%)` : ''}
                </div>
              )}
            </div>
            <div className="cart-total"><span>Total</span><span>{rupiah(total)}</span></div>
            <div className="cart-actions">
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center', padding: 10 }}
                onClick={handleHold}
                disabled={!cart.length}
                title="Tahan pesanan pelanggan ini, layani pelanggan lain"
              >
                <i className="bi bi-pause-circle"></i> Tahan Pesanan
              </button>
              <button
                className="btn btn-success"
                style={{ width: '100%', justifyContent: 'center', padding: 12 }}
                onClick={() => setCheckoutOpen(true)}
                disabled={!cart.length}
              >
                <i className="bi bi-credit-card"></i> Bayar (F2)
              </button>
            </div>
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <button className="fab-cart" onClick={scrollToCart} style={{ display: 'flex' }}>
          <i className="bi bi-cart3"></i> {count} · {rupiah(total)}
        </button>
      )}

      {cameraOpen && (
        <Suspense fallback={
          <div className="modal-overlay show">
            <div className="modal-box" style={{ textAlign: 'center' }}>Memuat kamera...</div>
          </div>
        }>
          <BarcodeScanner
            onClose={() => setCameraOpen(false)}
            lastFeedback={scanMsg}
            onScan={(code) => {
              handleScan(code)
            }}
          />
        </Suspense>
      )}

      {checkoutOpen && (
        <CheckoutModal
          total={total}
          discount={discountAmount}
          cart={cart}
          user={user}
          initialCustomer={customerName}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(res) => {
            setCheckoutOpen(false)
            setSuccess(res)
          }}
        />
      )}

      {transferTarget && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setTransferTarget(null)}>
          <div className="modal-box">
            <h3 style={{ marginTop: 0 }}><i className="bi bi-arrow-left-right"></i> Pindah Pesanan</h3>
            <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>
              Pesanan <strong>{transferTarget.customer_name}</strong> ({transferTarget.item_count} item · {rupiah(transferTarget.total)})
              belum selesai. Pindahkan ke pelanggan lain.
            </p>
            <form onSubmit={submitTransfer}>
              <div className="form-group">
                <label className="form-label">Nama pelanggan baru *</label>
                <input
                  type="text"
                  className="form-control"
                  value={transferName}
                  onChange={(e) => setTransferName(e.target.value)}
                  placeholder="Contoh: Pelanggan B"
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setTransferTarget(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <i className="bi bi-check-lg"></i> Pindahkan
                </button>
              </div>
            </form>
          </div>
        </div>
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
                  setDiscountValue(0)
                  setDiscountType('rp')
                  setCustomerName('')
                  setReloadKey((k) => k + 1)
                  requestAnimationFrame(() => scanInputRef.current?.focus())
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

function CheckoutModal({ total, discount, cart, user, initialCustomer = '', onClose, onSuccess }) {
  const [customerName, setCustomerName] = useState(initialCustomer || '')
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
            <label className="form-label">Uang Diterima</label>
            <div className="quick-cash">
              <button type="button" onClick={() => setCashReceived(50000)}>50rb</button>
              <button type="button" onClick={() => setCashReceived(100000)}>100rb</button>
              <button type="button" onClick={() => setCashReceived(200000)}>200rb</button>
              <button type="button" onClick={() => setCashReceived(total)}>Pas</button>
            </div>
            <RupiahInput value={cashReceived} onChange={setCashReceived} autoFocus />
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
