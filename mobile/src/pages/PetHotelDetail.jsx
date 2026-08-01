import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getHotelBooking,
  checkInHotelBooking,
  checkOutHotelBooking,
  cancelHotelBooking,
} from '../db/store'
import { useToast } from '../context/ToastContext'
import { rupiah, dateShort, dateTimeShort } from '../utils/format'
import RupiahInput from '../components/RupiahInput'

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
const PAY_LABEL = { unpaid: 'Belum Bayar', partial: 'DP / Sebagian', paid: 'Lunas' }

export default function PetHotelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [reload, setReload] = useState(0)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [extraFee, setExtraFee] = useState(0)

  const result = useMemo(() => getHotelBooking(id), [id, reload])

  if (!result.ok) {
    return (
      <>
        <h1 className="page-title">Detail Penitipan</h1>
        <div className="card"><div className="empty-state"><i className="bi bi-exclamation-circle"></i>{result.message}</div></div>
        <Link to="/pet-hotel" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
      </>
    )
  }

  const b = result.booking

  function doCheckIn() {
    if (!confirm(`Check-in ${b.pet_name} sekarang?`)) return
    const res = checkInHotelBooking(id)
    res.ok ? toast.success(res.message) : toast.error(res.message)
    setReload((r) => r + 1)
  }

  function doCancel() {
    if (!confirm('Batalkan booking ini?')) return
    const res = cancelHotelBooking(id)
    if (res.ok) {
      toast.success(res.message)
      navigate('/pet-hotel')
    } else toast.error(res.message)
  }

  function doCheckOut() {
    const res = checkOutHotelBooking(id, {
      payment_method: payMethod,
      payment_status: 'paid',
      extra_fee: Number(extraFee) || 0,
    })
    if (res.ok) {
      toast.success(res.message)
      setCheckoutOpen(false)
      setReload((r) => r + 1)
    } else toast.error(res.message)
  }

  return (
    <>
      <h1 className="page-title">Detail Penitipan</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link to="/pet-hotel" className="btn btn-outline btn-sm"><i className="bi bi-arrow-left"></i> Kembali</Link>
        {['reserved', 'checked_in'].includes(b.status) && (
          <Link to={`/pet-hotel/${id}/edit`} className="btn btn-outline btn-sm"><i className="bi bi-pencil"></i> Edit</Link>
        )}
        {b.status === 'reserved' && (
          <>
            <button className="btn btn-success btn-sm" onClick={doCheckIn}><i className="bi bi-box-arrow-in-right"></i> Check-in</button>
            <button className="btn btn-danger btn-sm" onClick={doCancel}><i className="bi bi-x-lg"></i> Batalkan</button>
          </>
        )}
        {b.status === 'checked_in' && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setExtraFee(b.extra_fee || 0); setCheckoutOpen(true) }}
          >
            <i className="bi bi-box-arrow-right"></i> Check-out
          </button>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">Informasi Booking</div>
          <div className="card-body">
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>No. Booking</td><td><strong>{b.booking_number}</strong></td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Status</td><td><span className={`badge ${STATUS_BADGE[b.status]}`}>{STATUS_LABEL[b.status]}</span></td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Kamar</td><td><code>{b.room_code}</code> — {b.room_name}</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Check-in rencana</td><td>{dateShort(b.check_in_date)}</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Check-out rencana</td><td>{dateShort(b.check_out_date)} ({b.days} hari)</td></tr>
                {b.actual_check_in && <tr><td style={{ padding: '6px 0', color: '#666' }}>Check-in aktual</td><td>{dateTimeShort(b.actual_check_in)}</td></tr>}
                {b.actual_check_out && <tr><td style={{ padding: '6px 0', color: '#666' }}>Check-out aktual</td><td>{dateTimeShort(b.actual_check_out)}</td></tr>}
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Dibuat oleh</td><td>{b.cashier_name}</td></tr>
                {b.notes && <tr><td style={{ padding: '6px 0', color: '#666' }}>Catatan</td><td>{b.notes}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Pemilik & Hewan</div>
          <div className="card-body">
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Pemilik</td><td><strong>{b.owner_name}</strong></td></tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>No. HP</td><td>{b.owner_phone || '-'}</td></tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>Hewan</td>
                  <td>{b.pet_type === 'anjing' ? '🐶' : '🐱'} <strong>{b.pet_name}</strong></td>
                </tr>
                <tr><td style={{ padding: '6px 0', color: '#666' }}>Jenis / Ras</td><td>{b.pet_type}{b.pet_breed ? ` · ${b.pet_breed}` : ''}</td></tr>
                {b.pet_notes && <tr><td style={{ padding: '6px 0', color: '#666' }}>Catatan hewan</td><td>{b.pet_notes}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">Ringkasan Biaya</div>
        <div className="card-body">
          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>{b.days} hari × {rupiah(b.price_per_day)}</td>
                <td style={{ textAlign: 'right' }}>{rupiah(b.days * b.price_per_day)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Biaya tambahan</td>
                <td style={{ textAlign: 'right' }}>{rupiah(b.extra_fee)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Diskon</td>
                <td style={{ textAlign: 'right' }}>{rupiah(b.discount)}</td>
              </tr>
              <tr style={{ fontSize: 18, fontWeight: 700, borderTop: '2px solid #eee' }}>
                <td style={{ padding: '10px 0' }}>Total</td>
                <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{rupiah(b.total)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Status Bayar</td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`badge ${b.payment_status === 'paid' ? 'badge-success' : b.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                    {PAY_LABEL[b.payment_status] || b.payment_status}
                  </span>
                </td>
              </tr>
              {b.payment_method && (
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>Metode Bayar</td>
                  <td style={{ textAlign: 'right' }}><span className="badge badge-info">{b.payment_method.toUpperCase()}</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {checkoutOpen && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setCheckoutOpen(false)}>
          <div className="modal-box">
            <h3 style={{ marginTop: 0 }}><i className="bi bi-box-arrow-right"></i> Check-out {b.pet_name}</h3>
            <p style={{ color: '#666', fontSize: 13 }}>Kamar {b.room_code} akan dibebaskan setelah check-out.</p>
            <div className="form-group">
              <label className="form-label">Biaya Tambahan</label>
              <RupiahInput value={extraFee} onChange={setExtraFee} />
            </div>
            <div className="form-group">
              <label className="form-label">Metode Pembayaran</label>
              <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">💵 Tunai</option>
                <option value="transfer">🏦 Transfer</option>
                <option value="qris">📱 QRIS</option>
              </select>
            </div>
            <div style={{ background: '#e8f7fa', borderRadius: 8, padding: 12, marginBottom: 16, fontWeight: 700 }}>
              Total dibayar: {rupiah(Math.max(0, b.days * b.price_per_day + (Number(extraFee) || 0) - (b.discount || 0)))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCheckoutOpen(false)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={doCheckOut}>
                <i className="bi bi-check-lg"></i> Proses Check-out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
