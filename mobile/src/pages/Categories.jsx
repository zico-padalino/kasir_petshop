import { useState, useMemo } from 'react'
import { getCategoriesWithCounts, createCategory, updateCategory, deleteCategory } from '../db/store'
import { useToast } from '../context/ToastContext'

export default function Categories() {
  const toast = useToast()
  const [reload, setReload] = useState(0)
  const categories = useMemo(() => getCategoriesWithCounts(), [reload])

  const [editing, setEditing] = useState(null) // id or null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function resetForm() {
    setEditing(null); setName(''); setDescription('')
  }

  function startEdit(cat) {
    setEditing(cat.id); setName(cat.name); setDescription(cat.description ?? '')
  }

  function submit(e) {
    e.preventDefault()
    const res = editing
      ? updateCategory(editing, { name, description })
      : createCategory({ name, description })
    if (res.ok) {
      toast.success(res.message)
      resetForm()
      setReload((r) => r + 1)
    } else {
      toast.error(res.message)
    }
  }

  function handleDelete(id) {
    if (!confirm('Hapus kategori?')) return
    const res = deleteCategory(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    if (editing === id) resetForm()
    setReload((r) => r + 1)
  }

  return (
    <>
      <h1 className="page-title">Kategori Produk</h1>

      <div className="side-form-grid">
        <div className="card">
          <div className="card-header"><span>Daftar Kategori</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Nama</th><th>Deskripsi</th><th>Produk</th><th>Aksi</th></tr></thead>
                <tbody>
                  {categories.length ? categories.map((cat) => (
                    <tr key={cat.id}>
                      <td><strong>{cat.name}</strong></td>
                      <td>{cat.description ?? '-'}</td>
                      <td><span className="badge badge-info">{cat.product_count} produk</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => startEdit(cat)}><i className="bi bi-pencil"></i></button>{' '}
                        {cat.product_count === 0 && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat.id)}><i className="bi bi-trash"></i></button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="empty-state">Belum ada kategori</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</span></div>
          <div className="card-body">
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Nama Kategori *</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea className="form-control" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <i className="bi bi-check-lg"></i> {editing ? 'Update' : 'Simpan'}
              </button>
              {editing && (
                <button type="button" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={resetForm}>
                  Batal Edit
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
