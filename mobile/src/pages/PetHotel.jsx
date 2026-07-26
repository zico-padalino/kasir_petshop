import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getHotelStats,
  getHotelBookings,
  checkInHotelBooking,
  cancelHotelBooking,
} from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rupiah, dateShort } from '../utils/format'

const STATUS_BADGE = {
  reserved: 'badge-info',
  checked_in: 'badge-success',
  checked_out: 'badge-warning',
  cancelled: 'badge-danger',
}
const STATUS_LABEL = {
  reserved: 'Reservasi',
  checked_in: 'Sedang Dititip',
  checked_out: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function PetHotel() {
  const { can } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState({ status: '', search: '' })
  const [reload, setReload] = useState(0)

  const stats = useMemo(() => getHotelStats(), [reload])
  const bookings = useMemo(() => getHotelBookings(applied), [applied, reload])

  function apply(e) {
    e.preventDefault()
    setApplied({ status, search })
  }

  function doCheckIn(id) {
    if (!confirm('Check-in hewan sekarang?')) return
    const res = checkInHotelBooking(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setReload((r) => r + 1)
  }

  function doCancel(id) {
    if (!confirm('Batalkan booking ini?')) return
    const res = cancelHotelBooking(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setReload((r) => r + 1)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Titip Hewan (Pet Hotel)</h1>
          <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Catat penitipan anjing & kucing di toko</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {can('admin') ? (
            <Link to="/pet-hotel/rooms" className="btn btn-outline btn-sm">
              <i className="bi bi-door-open"></i> Kelola Kamar
            </Link>
          ) : (
            <Link to="/pet-hotel/rooms" className="btn btn-outline btn-sm">
              <i className="bi bi-images"></i> Lihat Kamar
            </Link>
          )}
          <Link to="/pet-hotel/create" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg"></i> Titip Baru
          </Link>
        </div>
      </div>
      <div style={{ height: 20 }} />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon teal"><i className="bi bi-door-closed"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.available}/{stats.total_rooms}</div>
            <div className="stat-label">Kamar Tersedia</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="bi bi-house-heart"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.checked_in}</div>
            <div className="stat-label">Sedang Dititip</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><i className="bi bi-calendar-check"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.reserved}</div>
            <div className="stat-label">Reservasi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="bi bi-box-arrow-right"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.checkout_today}</div>
            <div className="stat-label">Checkout Hari Ini</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span><i className="bi bi-list-ul"></i> Daftar hewan dititip</span>
        </div>
        <div className="card-body">
          <form className="search-bar" onSubmit={apply}>
            <input
              type="text"
              className="form-control"
              placeholder="Cari no. booking / pemilik / hewan / HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-control" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="reserved">Reservasi</option>
              <option value="checked_in">Sedang Dititip</option>
              <option value="checked_out">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-funnel"></i> Filter</button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setStatus(''); setSearch(''); setApplied({ status: '', search: '' }) }}
            >
              Reset
            </button>
          </form>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Booking</th>
                  <th>Hewan</th>
                  <th>Pemilik</th>
                  <th>Kamar</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length ? bookings.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.booking_number}</strong></td>
                    <td>
                      {b.pet_type === 'anjing' ? '🐶' : '🐱'} {b.pet_name}
                      <div style={{ fontSize: 11, color: '#888' }}>{b.pet_breed || b.pet_type}</div>
                    </td>
                    <td>
                      {b.owner_name}
                      <div style={{ fontSize: 11, color: '#888' }}>{b.owner_phone || '-'}</div>
                    </td>
                    <td><code>{b.room_code}</code></td>
                    <td>{dateShort(b.check_in_date)}</td>
                    <td>{dateShort(b.check_out_date)}</td>
                    <td>{rupiah(b.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/pet-hotel/${b.id}`} className="btn btn-sm btn-outline" title="Detail">
                        <i className="bi bi-eye"></i>
                      </Link>{' '}
                      {b.status === 'reserved' && (
                        <>
                          <button className="btn btn-sm btn-success" title="Check-in" onClick={() => doCheckIn(b.id)}>
                            <i className="bi bi-box-arrow-in-right"></i>
                          </button>{' '}
                          <button className="btn btn-sm btn-danger" title="Batalkan" onClick={() => doCancel(b.id)}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </>
                      )}
                      {b.status === 'checked_in' && (
                        <Link to={`/pet-hotel/${b.id}`} className="btn btn-sm btn-primary" title="Check-out">
                          <i className="bi bi-box-arrow-right"></i>
                        </Link>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="9" className="empty-state">Belum ada data penitipan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
