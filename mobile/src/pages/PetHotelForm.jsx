import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getHotelBooking,
  getAvailableRooms,
  createHotelBooking,
  updateHotelBooking,
} from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rupiah, todayInput } from '../utils/format'
import { RoomCard } from '../components/RoomCard'
import RupiahInput from '../components/RupiahInput'

function daysBetween(a, b) {
  if (!a || !b || b <= a) return 1
  const d1 = new Date(a + 'T00:00:00')
  const d2 = new Date(b + 'T00:00:00')
  return Math.max(1, Math.round((d2 - d1) / 86400000))
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function PetHotelForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const existing = useMemo(() => (isEdit ? getHotelBooking(id) : null), [id, isEdit])

  const [form, setForm] = useState(() => {
    if (existing?.ok) {
      const b = existing.booking
      return {
        owner_name: b.owner_name,
        owner_phone: b.owner_phone || '',
        pet_name: b.pet_name,
        pet_type: b.pet_type,
        pet_breed: b.pet_breed || '',
        pet_notes: b.pet_notes || '',
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        room_id: b.room_id,
        price_per_day: b.price_per_day,
        extra_fee: b.extra_fee || 0,
        discount: b.discount || 0,
        payment_status: b.payment_status,
        notes: b.notes || '',
        status: b.status,
      }
    }
    const today = todayInput()
    return {
      owner_name: '',
      owner_phone: '',
      pet_name: '',
      pet_type: 'anjing',
      pet_breed: '',
      pet_notes: '',
      check_in_date: today,
      check_out_date: addDays(today, 2),
      room_id: '',
      price_per_day: 0,
      extra_fee: 0,
      discount: 0,
      payment_status: 'unpaid',
      notes: '',
      status: 'reserved',
    }
  })

  const rooms = useMemo(
    () =>
      getAvailableRooms({
        petType: form.pet_type,
        checkIn: form.check_in_date,
        checkOut: form.check_out_date,
        excludeBookingId: isEdit ? id : null,
      }),
    [form.pet_type, form.check_in_date, form.check_out_date, isEdit, id]
  )

  useEffect(() => {
    if (!form.room_id) return
    const room = rooms.find((r) => r.id === Number(form.room_id))
    if (room && !isEdit) {
      setForm((f) => ({ ...f, price_per_day: room.price_per_day }))
    }
  }, [form.room_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.room_id && !rooms.some((r) => r.id === Number(form.room_id))) {
      setForm((f) => ({ ...f, room_id: '', price_per_day: isEdit ? f.price_per_day : 0 }))
    }
  }, [rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function pickRoom(room) {
    setForm((f) => ({
      ...f,
      room_id: room.id,
      price_per_day: room.price_per_day,
    }))
  }

  const days = daysBetween(form.check_in_date, form.check_out_date)
  const total = Math.max(0, days * (Number(form.price_per_day) || 0) + (Number(form.extra_fee) || 0) - (Number(form.discount) || 0))

  function submit(e) {
    e.preventDefault()
    if (!form.room_id) {
      toast.error('Pilih kamar terlebih dahulu.')
      return
    }
    const res = isEdit
      ? updateHotelBooking(id, form)
      : createHotelBooking(form, user)
    if (res.ok) {
      toast.success(res.message)
      navigate(isEdit ? `/pet-hotel/${id}` : `/pet-hotel/${res.id}`)
    } else {
      toast.error(res.message)
    }
  }

  if (isEdit && (!existing || !existing.ok)) {
    return (
      <>
        <h1 className="page-title">Edit Booking</h1>
        <div className="card"><div className="empty-state">{existing?.message || 'Booking tidak ditemukan'}</div></div>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">{isEdit ? 'Ubah data penitipan' : 'Titip hewan baru'}</h1>
      <p style={{ margin: '-8px 0 16px', color: '#666', fontSize: 13 }}>Isi data pemilik & hewan, lalu pilih kamar</p>

      <div className="card" style={{ maxWidth: 900 }}>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nama Pemilik *</label>
                <input className="form-control" value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">No. HP</label>
                <input className="form-control" value={form.owner_phone} onChange={(e) => set('owner_phone', e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nama Hewan *</label>
                <input className="form-control" value={form.pet_name} onChange={(e) => set('pet_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Jenis Hewan *</label>
                <select className="form-control" value={form.pet_type} onChange={(e) => { set('pet_type', e.target.value); set('room_id', '') }}>
                  <option value="anjing">🐶 Anjing</option>
                  <option value="kucing">🐱 Kucing</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ras / Breed</label>
                <input className="form-control" value={form.pet_breed} onChange={(e) => set('pet_breed', e.target.value)} placeholder="Persia, Pomeranian, ..." />
              </div>
              <div className="form-group">
                <label className="form-label">Catatan Hewan</label>
                <input className="form-control" value={form.pet_notes} onChange={(e) => set('pet_notes', e.target.value)} placeholder="Alergi, vaksin, perilaku..." />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Check-in *</label>
                <input type="date" className="form-control" value={form.check_in_date} onChange={(e) => set('check_in_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Check-out *</label>
                <input type="date" className="form-control" value={form.check_out_date} onChange={(e) => set('check_out_date', e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <span className="room-picker-label">Pilih Kamar *</span>
              {rooms.length ? (
                <div className="room-grid">
                  {rooms.map((r) => (
                    <RoomCard
                      key={r.id}
                      room={{ ...r, is_occupied: false, is_active: 1 }}
                      selectable
                      selected={Number(form.room_id) === r.id}
                      onSelect={pickRoom}
                    />
                  ))}
                </div>
              ) : (
                <div className="room-picker-empty">Tidak ada kamar tersedia untuk jenis/periode ini.</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Harga / Hari</label>
                <RupiahInput value={form.price_per_day} onChange={(v) => set('price_per_day', v)} />
              </div>
              <div className="form-group">
                <label className="form-label">Biaya Tambahan</label>
                <RupiahInput value={form.extra_fee} onChange={(v) => set('extra_fee', v)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Diskon</label>
                <RupiahInput value={form.discount} onChange={(v) => set('discount', v)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status Bayar</label>
                <select className="form-control" value={form.payment_status} onChange={(e) => set('payment_status', e.target.value)}>
                  <option value="unpaid">Belum Bayar</option>
                  <option value="partial">DP / Sebagian</option>
                  <option value="paid">Lunas</option>
                </select>
              </div>
            </div>

            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Status Awal</label>
                <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="reserved">Reservasi (check-in nanti)</option>
                  <option value="checked_in">Langsung Check-in</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea className="form-control" rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>

            <div style={{ background: '#e8f7fa', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{days} hari × {rupiah(form.price_per_day)}</span>
                <span>{rupiah(days * (Number(form.price_per_day) || 0))}</span>
              </div>
              {(Number(form.extra_fee) > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>Biaya tambahan</span><span>{rupiah(form.extra_fee)}</span>
                </div>
              )}
              {(Number(form.discount) > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>Diskon</span><span>- {rupiah(form.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid #b8e0e8', paddingTop: 8, marginTop: 4 }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{rupiah(total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link to={isEdit ? `/pet-hotel/${id}` : '/pet-hotel'} className="btn btn-outline">Batal</Link>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-check-lg"></i> {isEdit ? 'Update' : 'Simpan Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
