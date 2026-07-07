import { useState, useMemo } from 'react'
import { getUsers, getRoles, createUser, updateUser, deleteUser } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const EMPTY = { name: '', email: '', password: '', role_id: '', is_active: true }

export default function Users() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const roles = useMemo(() => getRoles(), [])
  const [reload, setReload] = useState(0)
  const users = useMemo(() => getUsers(), [reload])

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY, role_id: roles[0]?.id ?? '' })

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function resetForm() {
    setEditing(null)
    setForm({ ...EMPTY, role_id: roles[0]?.id ?? '' })
  }

  function startEdit(u) {
    setEditing(u.id)
    setForm({ name: u.name, email: u.email, password: '', role_id: u.role_id, is_active: Boolean(u.is_active) })
  }

  function submit(e) {
    e.preventDefault()
    const res = editing ? updateUser(editing, form) : createUser(form)
    if (res.ok) {
      toast.success(res.message)
      resetForm()
      setReload((r) => r + 1)
    } else {
      toast.error(res.message)
    }
  }

  function handleDelete(id) {
    if (!confirm('Hapus pengguna?')) return
    const res = deleteUser(id, currentUser)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    if (editing === id) resetForm()
    setReload((r) => r + 1)
  }

  function roleBadge(slug, name) {
    if (slug === 'admin') return <span className="badge badge-danger">{name}</span>
    if (slug === 'kasir') return <span className="badge badge-info">{name}</span>
    return <span className="badge badge-warning">{name}</span>
  }

  return (
    <>
      <h1 className="page-title">Pengguna & Role Akses</h1>

      <div className="side-form-grid" style={{ gridTemplateColumns: '1fr 380px' }}>
        <div className="card">
          <div className="card-header"><span>Daftar Pengguna</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td>{roleBadge(u.role_slug, u.role_name)}</td>
                      <td>{u.is_active ? <span className="badge badge-success">Aktif</span> : <span className="badge badge-danger">Nonaktif</span>}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => startEdit(u)}><i className="bi bi-pencil"></i></button>{' '}
                        {u.id !== currentUser?.id && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}><i className="bi bi-trash"></i></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><span>{editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</span></div>
            <div className="card-body">
              <form onSubmit={submit}>
                <div className="form-group">
                  <label className="form-label">Nama *</label>
                  <input type="text" className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password {editing ? <span>(kosongkan jika tidak diubah)</span> : <span>*</span>}</label>
                  <input type="password" className="form-control" value={form.password} onChange={(e) => set('password', e.target.value)} required={!editing} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-control" value={form.role_id} onChange={(e) => set('role_id', e.target.value)} required>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.description}</option>)}
                  </select>
                </div>
                {editing && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="userActive" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                    <label htmlFor="userActive" style={{ margin: 0 }}>Akun Aktif</label>
                  </div>
                )}
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

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">Hak Akses Role</div>
            <div className="card-body" style={{ fontSize: 13 }}>
              <p><span className="badge badge-danger">Admin</span> Akses penuh: POS, produk, kategori, pengguna</p>
              <p><span className="badge badge-info">Kasir</span> POS dan riwayat transaksi sendiri</p>
              <p><span className="badge badge-warning">Owner</span> Dashboard, POS, lihat produk & semua transaksi</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
