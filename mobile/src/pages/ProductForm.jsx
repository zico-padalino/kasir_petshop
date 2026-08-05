import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  getCategories,
  getProduct,
  createProduct,
  updateProduct,
  normalizeScanCode,
  generateNextSku,
} from '../db/store'
import { useToast } from '../context/ToastContext'
import RupiahInput from '../components/RupiahInput'

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))

function compressProductPhoto(file, maxW = 320, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Gagal membaca gambar.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef(null)
  const categories = useMemo(() => getCategories(), [])
  const existing = useMemo(() => (isEdit ? getProduct(id) : null), [id, isEdit])

  const [form, setForm] = useState(() => ({
    category_id: existing?.category_id ?? '',
    sku: existing?.sku ?? '',
    barcode: existing?.barcode ?? '',
    price: existing?.price ?? 0,
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    stock: existing?.stock ?? 0,
    photo: existing?.photo ?? null,
    is_active: existing ? Boolean(existing.is_active) : true,
  }))
  const [scanOpen, setScanOpen] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  useEffect(() => {
    if (isEdit) return
    if (!form.category_id) {
      setForm((f) => (f.sku ? { ...f, sku: '' } : f))
      return
    }
    const next = generateNextSku(form.category_id)
    setForm((f) => (f.sku === next ? f : { ...f, sku: next }))
  }, [form.category_id, isEdit])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onPhotoPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar.')
      return
    }
    setPhotoBusy(true)
    try {
      const dataUrl = await compressProductPhoto(file)
      set('photo', dataUrl)
      toast.success('Foto produk siap. Simpan untuk menerapkan.')
    } catch (err) {
      toast.error(err.message || 'Gagal memproses foto.')
    } finally {
      setPhotoBusy(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      barcode: normalizeScanCode(form.barcode),
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
    }
    if (payload.stock <= 0) {
      toast.error('Isi stok minimal 1 agar bisa dijual di kasir.')
      return
    }
    if (payload.price <= 0) {
      toast.error('Isi harga produk terlebih dahulu.')
      return
    }
    const res = isEdit ? updateProduct(id, payload) : createProduct(payload)
    if (res.ok) {
      toast.success(res.message)
      navigate('/products')
    } else {
      toast.error(res.message)
    }
  }

  if (isEdit && !existing) {
    return (
      <>
        <h1 className="page-title">Edit Produk</h1>
        <div className="card"><div className="empty-state">Produk tidak ditemukan</div></div>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">{isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Kategori *</label>
              <select className="form-control" value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required>
                <option value="">Pilih Kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.sku || (isEdit ? '' : 'Pilih kategori dulu')}
                  readOnly
                  disabled
                  style={{ background: '#f8f9fa', fontWeight: 600 }}
                />
                <small style={{ color: '#888', fontSize: 12 }}>
                  {isEdit ? 'SKU tidak dapat diubah.' : 'Dibuat otomatis sesuai kategori (contoh: MK-006).'}
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Barcode *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-control"
                    value={form.barcode}
                    onChange={(e) => set('barcode', e.target.value)}
                    placeholder="Scan atau ketik angka barcode"
                    inputMode="numeric"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    title="Scan barcode kemasan"
                    onClick={() => setScanOpen(true)}
                    disabled={!window.isSecureContext}
                  >
                    <i className="bi bi-camera"></i>
                  </button>
                </div>
                <small style={{ color: '#888', fontSize: 12 }}>
                  Paling akurat: tekan ikon kamera, scan kemasan, angka terisi otomatis.
                </small>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Harga *</label>
              <RupiahInput value={form.price} onChange={(v) => set('price', v)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nama Produk *</label>
              <input type="text" className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Foto produk</label>
              <div className="product-photo-row">
                <div className="product-photo-preview">
                  {form.photo ? <img src={form.photo} alt="" /> : <span>📦</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoPick} />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={photoBusy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <i className="bi bi-image"></i> {photoBusy ? 'Memproses...' : 'Unggah foto'}
                  </button>
                  {form.photo && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => set('photo', null)}>
                      Hapus foto
                    </button>
                  )}
                </div>
              </div>
              <small style={{ color: '#888', fontSize: 12 }}>Tampil di kartu kasir. PNG/JPG, otomatis diperkecil.</small>
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="form-control" rows="3" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Stok *</label>
                <input type="number" className="form-control" value={form.stock} onChange={(e) => set('stock', e.target.value)} min="1" required />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                <label htmlFor="is_active" style={{ margin: 0 }}>Produk Aktif</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Link to="/products" className="btn btn-outline">Batal</Link>
              <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg"></i> {isEdit ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      </div>

      {scanOpen && (
        <Suspense fallback={
          <div className="modal-overlay show">
            <div className="modal-box" style={{ textAlign: 'center' }}>Memuat kamera...</div>
          </div>
        }>
          <BarcodeScanner
            onClose={() => setScanOpen(false)}
            onScan={(code) => {
              const n = normalizeScanCode(code)
              set('barcode', n)
              toast.success(`Barcode diisi: ${n}`)
              setScanOpen(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
