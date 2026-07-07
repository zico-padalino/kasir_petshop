import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategories, addStock, deleteProduct } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rupiah } from '../utils/format'

export default function Products() {
  const { can } = useAuth()
  const toast = useToast()
  const isAdmin = can('admin')
  const categories = useMemo(() => getCategories(), [])

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [applied, setApplied] = useState({ search: '', categoryId: '' })
  const [reload, setReload] = useState(0)
  const [stockInputs, setStockInputs] = useState({})

  const products = useMemo(() => getProducts(applied), [applied, reload])

  function apply(e) {
    e.preventDefault()
    setApplied({ search, categoryId })
  }

  function handleAddStock(id) {
    const amount = Number(stockInputs[id] ?? 10)
    if (amount <= 0) return
    const res = addStock(id, amount)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setReload((r) => r + 1)
  }

  function handleDelete(id) {
    if (!confirm('Hapus produk ini?')) return
    const res = deleteProduct(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setReload((r) => r + 1)
  }

  return (
    <>
      <h1 className="page-title">Daftar Produk</h1>

      <div className="card">
        <div className="card-header">
          <span>Semua Produk</span>
          {isAdmin && (
            <Link to="/products/create" className="btn btn-primary btn-sm"><i className="bi bi-plus-lg"></i> Tambah Produk</Link>
          )}
        </div>
        <div className="card-body">
          <form className="search-bar" onSubmit={apply}>
            <input type="text" className="form-control" placeholder="Cari nama atau SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-control" style={{ maxWidth: 200 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Semua Kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-search"></i> Filter</button>
          </form>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th><th>Nama Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th>
                  {isAdmin && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {products.length ? products.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.sku}</code></td>
                    <td>{p.name}</td>
                    <td>{p.category_name}</td>
                    <td>{rupiah(p.price)}</td>
                    <td>{p.stock <= 10 ? <span className="badge badge-warning">{p.stock}</span> : p.stock}</td>
                    <td>{p.is_active ? <span className="badge badge-success">Aktif</span> : <span className="badge badge-danger">Nonaktif</span>}</td>
                    {isAdmin && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            value={stockInputs[p.id] ?? 10}
                            onChange={(e) => setStockInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                            style={{ width: 55, padding: 4, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
                          />
                          <button className="btn btn-sm btn-success" title="Tambah Stok" onClick={() => handleAddStock(p.id)}><i className="bi bi-plus-lg"></i></button>
                        </span>{' '}
                        <Link to={`/products/${p.id}/edit`} className="btn btn-sm btn-outline"><i className="bi bi-pencil"></i></Link>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}><i className="bi bi-trash"></i></button>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan={isAdmin ? 7 : 6} className="empty-state">Belum ada produk</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
