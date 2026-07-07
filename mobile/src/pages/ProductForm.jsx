import { useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getCategories, getProduct, createProduct, updateProduct } from '../db/store'
import { useToast } from '../context/ToastContext'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const categories = useMemo(() => getCategories(), [])
  const existing = useMemo(() => (isEdit ? getProduct(id) : null), [id, isEdit])

  const [form, setForm] = useState(() => ({
    category_id: existing?.category_id ?? '',
    sku: existing?.sku ?? '',
    price: existing?.price ?? 0,
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    stock: existing?.stock ?? 0,
    is_active: existing ? Boolean(existing.is_active) : true,
  }))

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function submit(e) {
    e.preventDefault()
    const res = isEdit ? updateProduct(id, form) : createProduct(form)
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
                <label className="form-label">SKU *</label>
                <input type="text" className="form-control" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="MK-006" required />
              </div>
              <div className="form-group">
                <label className="form-label">Harga (Rp) *</label>
                <input type="number" className="form-control" value={form.price} onChange={(e) => set('price', e.target.value)} min="0" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Produk *</label>
              <input type="text" className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="form-control" rows="3" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Stok *</label>
                <input type="number" className="form-control" value={form.stock} onChange={(e) => set('stock', e.target.value)} min="0" required />
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
    </>
  )
}
