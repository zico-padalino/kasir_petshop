import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ATTENDANCE_BARCODE,
  getAttendanceBarcode,
  getAttendanceFormUrl,
  getAttendanceLogs,
  getAttendanceTodaySummary,
  attendancePathFromScan,
} from '../db/store'
import { useAuth } from '../context/AuthContext'
import { dateTimeShort, todayInput, monthStartInput } from '../utils/format'
import { unlockAttendanceSession } from '../utils/attendanceSession'

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))

const ROLE_LABEL = { admin: 'Admin', kasir: 'Kasir', owner: 'Owner' }

function beepOk() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.value = 0.08
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => { o.stop(); ctx.close() }, 80)
  } catch { /* ignore */ }
}

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export default function Attendance() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const shopCode = getAttendanceBarcode()
  const formUrl = useMemo(() => getAttendanceFormUrl(), [])
  const [scanCode, setScanCode] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [preview, setPreview] = useState(null)
  const [reload, setReload] = useState(0)
  const [dateFrom, setDateFrom] = useState(monthStartInput())
  const [dateTo, setDateTo] = useState(todayInput())
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState({
    dateFrom: monthStartInput(),
    dateTo: todayInput(),
    search: '',
  })
  const scanRef = useRef(null)

  const today = useMemo(() => getAttendanceTodaySummary(), [reload])
  const logs = useMemo(() => getAttendanceLogs({ ...applied, limit: 150 }), [applied, reload])
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formUrl)}`

  useEffect(() => {
    scanRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(t)
  }, [feedback])

  function goToForm(raw) {
    const code = String(raw || '').trim()
    if (!code) return
    const path = attendancePathFromScan(code)
    if (!path) {
      setFeedback({ type: 'err', text: `Barcode salah. Scan QR absensi atau kode: ${ATTENDANCE_BARCODE}` })
      return
    }
    beepOk()
    unlockAttendanceSession()
    setScanCode('')
    navigate(path)
  }

  function submitScan(e) {
    e.preventDefault()
    goToForm(scanCode)
  }

  return (
    <>
      <h1 className="page-title">Absensi Karyawan</h1>
      <p style={{ margin: '-12px 0 16px', color: '#666', fontSize: 13 }}>
        Scan barcode toko untuk masuk ke halaman absen
      </p>

      <div className="home-tip" style={{ marginTop: 0, marginBottom: 14 }}>
        <strong>Cara:</strong> Scan QR di bawah dengan kamera HP → browser membuka halaman absensi.
        Atau ketik kode <code>{shopCode}</code> di kolom scan.
      </div>

      <div className="att-shop-code">
        <img src={qrUrl} alt="QR Absensi" width={160} height={160} />
        <div>
          <div className="att-shop-label">QR Absensi (buka URL)</div>
          <div className="att-code">{shopCode}</div>
          <p className="att-url-text">{formUrl}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666' }}>
            Tempel QR ini di meja absensi. Scan dengan kamera HP akan membuka langsung form absen.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => {
              navigator.clipboard?.writeText(formUrl)
              setFeedback({ type: 'ok', text: 'URL absensi disalin.' })
            }}
          >
            <i className="bi bi-clipboard"></i> Salin URL
          </button>
        </div>
      </div>

      <form className="scan-bar" onSubmit={submitScan}>
        <div className="scan-bar-icon"><i className="bi bi-upc-scan"></i></div>
        <input
          ref={scanRef}
          type="text"
          className="form-control scan-input"
          placeholder={`Scan / ketik ${shopCode} lalu Enter`}
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!scanCode.trim()}>
          Masuk Absen
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setCameraOpen(true)}>
          <i className="bi bi-camera"></i> Kamera
        </button>
      </form>

      {feedback && (
        <div className={`scan-feedback ${feedback.type === 'ok' ? 'ok' : 'err'}`}>
          {feedback.type === 'ok' ? <i className="bi bi-check-circle-fill"></i> : <i className="bi bi-exclamation-circle-fill"></i>}
          {feedback.text}
        </div>
      )}

      <div className="home-summary" style={{ margin: '16px 0', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="home-summary-item">
          <div className="home-summary-value">{today.present}</div>
          <div className="home-summary-label">Sedang masuk</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{today.left}</div>
          <div className="home-summary-label">Sudah pulang</div>
        </div>
        <div className="home-summary-item">
          <div className="home-summary-value">{today.total_scans}</div>
          <div className="home-summary-label">Absen hari ini</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span>Absensi hari ini</span></div>
        <div className="card-body" style={{ padding: 0 }}>
          {today.logs.length ? (
            <div className="att-list">
              {today.logs.map((l) => (
                <div key={l.id} className={`att-item att-${l.type}`}>
                  {l.selfie ? (
                    <button type="button" className="att-thumb" onClick={() => setPreview(l)}>
                      <img src={l.selfie} alt="" />
                    </button>
                  ) : (
                    <div className="att-emoji">{l.type === 'in' ? '🟢' : '🔵'}</div>
                  )}
                  <div className="att-body">
                    <div className="att-name">{l.user_name}</div>
                    <div className="att-meta">
                      <span className={`badge ${l.type === 'in' ? 'badge-success' : 'badge-info'}`}>
                        {l.type === 'in' ? 'Masuk' : 'Pulang'}
                      </span>
                      {l.latitude != null && (
                        <a href={mapsLink(l.latitude, l.longitude)} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>
                          {Number(l.latitude).toFixed(4)}, {Number(l.longitude).toFixed(4)}
                        </a>
                      )}
                      <span className="att-time">{dateTimeShort(l.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <i className="bi bi-calendar-x"></i>
              Belum ada absensi hari ini
            </div>
          )}
        </div>
      </div>

      {can('admin', 'owner') && (
        <>
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault()
              setApplied({ dateFrom, dateTo, search })
              setReload((n) => n + 1)
            }}
          >
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} />
            <span style={{ alignSelf: 'center', color: '#666' }}>s/d</span>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} />
            <input type="text" className="form-control" placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm"><i className="bi bi-funnel"></i> Filter</button>
          </form>

          <div className="card">
            <div className="card-header"><span>Riwayat absensi</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Nama</th>
                      <th>Jenis</th>
                      <th>Selfie</th>
                      <th>Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length ? logs.map((l) => (
                      <tr key={l.id}>
                        <td>{dateTimeShort(l.created_at)}</td>
                        <td>
                          <strong>{l.user_name}</strong>
                          {l.role_slug && (
                            <div style={{ fontSize: 11, color: '#888' }}>{ROLE_LABEL[l.role_slug] || l.role_slug}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${l.type === 'in' ? 'badge-success' : 'badge-info'}`}>
                            {l.type === 'in' ? 'Masuk' : 'Pulang'}
                          </span>
                        </td>
                        <td>
                          {l.selfie ? (
                            <button type="button" className="att-thumb-sm" onClick={() => setPreview(l)}>
                              <img src={l.selfie} alt="" />
                            </button>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: 11 }}>
                          {l.latitude != null ? (
                            <a href={mapsLink(l.latitude, l.longitude)} target="_blank" rel="noreferrer">
                              {Number(l.latitude).toFixed(5)}, {Number(l.longitude).toFixed(5)}
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {preview && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="modal-box" style={{ textAlign: 'center', maxWidth: 360 }}>
            <h3 style={{ marginTop: 0 }}>{preview.user_name}</h3>
            <p style={{ margin: '0 0 8px' }}>
              <span className={`badge ${preview.type === 'in' ? 'badge-success' : 'badge-info'}`}>
                {preview.type === 'in' ? 'Masuk' : 'Pulang'}
              </span>{' '}
              {dateTimeShort(preview.created_at)}
            </p>
            {preview.selfie && <img src={preview.selfie} alt="" style={{ width: '100%', borderRadius: 12 }} />}
            {preview.latitude != null && (
              <p style={{ fontSize: 12, marginTop: 10 }}>
                <a href={mapsLink(preview.latitude, preview.longitude)} target="_blank" rel="noreferrer">
                  {Number(preview.latitude).toFixed(6)}, {Number(preview.longitude).toFixed(6)}
                </a>
              </p>
            )}
            <button type="button" className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => setPreview(null)}>Tutup</button>
          </div>
        </div>
      )}

      {cameraOpen && (
        <Suspense fallback={
          <div className="modal-overlay show">
            <div className="modal-box" style={{ textAlign: 'center' }}>Memuat kamera...</div>
          </div>
        }>
          <BarcodeScanner
            onClose={() => setCameraOpen(false)}
            onScan={(code) => {
              setCameraOpen(false)
              goToForm(code)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
