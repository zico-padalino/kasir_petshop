import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getHotelRooms,
  createHotelRoom,
  updateHotelRoom,
  deleteHotelRoom,
} from '../db/store'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { RoomCard } from '../components/RoomCard'

const EMPTY = {
  code: '',
  name: '',
  pet_type: 'anjing',
  capacity: 1,
  price_per_day: 75000,
  is_active: true,
  description: '',
}

export default function PetHotelRooms() {
  const toast = useToast()
  const { can } = useAuth()
  const isAdmin = can('admin')
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState('all')
  const rooms = useMemo(() => getHotelRooms(), [reload])

  const filtered = useMemo(() => {
    if (filter === 'all') return rooms
    if (filter === 'available') return rooms.filter((r) => r.is_active && !r.is_occupied)
    if (filter === 'occupied') return rooms.filter((r) => r.is_occupied)
    return rooms.filter((r) => r.pet_type === filter)
  }, [rooms, filter])

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [formOpen, setFormOpen] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function resetForm() {
    setEditing(null)
    setForm({ ...EMPTY })
    setFormOpen(false)
  }

  function startEdit(r) {
    setEditing(r.id)
    setForm({
      code: r.code,
      name: r.name,
      pet_type: r.pet_type,
      capacity: r.capacity,
      price_per_day: r.price_per_day,
      is_active: Boolean(r.is_active),
      description: r.description || '',
    })
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startCreate() {
    setEditing(null)
    setForm({ ...EMPTY })
    setFormOpen(true)
  }

  function submit(e) {
    e.preventDefault()
    const res = editing ? updateHotelRoom(editing, form) : createHotelRoom(form)
    if (res.ok) {
      toast.success(res.message)
      resetForm()
      setReload((r) => r + 1)
    } else toast.error(res.message)
  }

  function handleDelete(id) {
    if (!confirm('Hapus / nonaktifkan kamar ini?')) return
    const res = deleteHotelRoom(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    if (editing === id) resetForm()
    setReload((r) => r + 1)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Galeri Kamar Pet Hotel</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/pet-hotel" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
          {isAdmin && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
              <i className="bi bi-plus-lg"></i> Tambah Kamar
            </button>
          )}
        </div>
      </div>
      <div style={{ height: 16 }} />

      <div className="category-tabs">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'available', label: 'Tersedia' },
          { id: 'occupied', label: 'Terisi' },
          { id: 'anjing', label: '🐶 Anjing' },
          { id: 'kucing', label: '🐱 Kucing' },
          { id: 'semua', label: '🐾 Multijenis' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`category-tab ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {formOpen && isAdmin && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span>{editing ? 'Edit Kamar' : 'Tambah Kamar Baru'}</span>
            <button type="button" className="btn btn-sm btn-outline" onClick={resetForm}>Tutup</button>
          </div>
          <div className="card-body">
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kode *</label>
                  <input className="form-control" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="A-01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Kamar *</label>
                  <input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jenis Hewan *</label>
                  <select className="form-control" value={form.pet_type} onChange={(e) => set('pet_type', e.target.value)}>
                    <option value="anjing">🐶 Anjing</option>
                    <option value="kucing">🐱 Kucing</option>
                    <option value="semua">🐾 Semua</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Harga/Hari (Rp) *</label>
                  <input type="number" className="form-control" min="0" value={form.price_per_day} onChange={(e) => set('price_per_day', e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kapasitas</label>
                  <input type="number" className="form-control" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 28 }}>
                  <input type="checkbox" id="roomActive" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                  <label htmlFor="roomActive" style={{ margin: 0 }}>Kamar Aktif</label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea className="form-control" rows="2" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Fasilitas, ukuran, AC, dll." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={resetForm}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-lg"></i> {editing ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filtered.length ? (
        <div className="room-grid">
          {filtered.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              showActions={isAdmin}
              onEdit={isAdmin ? startEdit : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state"><i className="bi bi-door-closed"></i>Tidak ada kamar pada filter ini</div>
        </div>
      )}
    </>
  )
}
