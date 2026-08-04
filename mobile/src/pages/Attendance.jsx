import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import {
  ATTENDANCE_BARCODE,
  clockAttendance,
  getAttendanceBarcode,
  getAttendanceLogs,
  getAttendanceTodaySummary,
  getUsers,
  isAttendanceBarcode,
  normalizeScanCode,
  peekNextAttendanceType,
} from '../db/store'
import { useAuth } from '../context/AuthContext'
import { dateTimeShort, todayInput, monthStartInput } from '../utils/format'

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

/** Ambil GPS */
function getGeoPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS tidak didukung di perangkat ini.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        reject(new Error(err.code === 1
          ? 'Izinkan akses lokasi di browser.'
          : 'Gagal membaca lokasi GPS.'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

/** Kompres selfie agar hemat localStorage */
function compressSelfie(dataUrl, maxW = 320, quality = 0.55) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function SelfieBox({ selfie, onCapture, onClear }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [live, setLive] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => () => stopCam(), [])

  function stopCam() {
    streamRef.current?.getTracks()?.forEach((t) => t.stop())
    streamRef.current = null
    setLive(false)
  }

  async function startCam() {
    setErr('')
    try {
      stopCam()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setLive(true)
    } catch {
      setErr('Kamera depan tidak bisa dibuka. Izinkan akses kamera.')
    }
  }

  async function snap() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const raw = canvas.toDataURL('image/jpeg', 0.85)
    const compressed = await compressSelfie(raw)
    stopCam()
    onCapture(compressed)
  }

  if (selfie) {
    return (
      <div className="att-selfie-preview">
        <img src={selfie} alt="Selfie absensi" />
        <button type="button" className="btn btn-outline btn-sm" onClick={onClear}>
          <i className="bi bi-arrow-repeat"></i> Ambil ulang
        </button>
      </div>
    )
  }

  return (
    <div className="att-selfie-box">
      <video ref={videoRef} className={`att-selfie-video ${live ? 'show' : ''}`} playsInline muted />
      {!live && (
        <div className="att-selfie-placeholder">
          <i className="bi bi-camera"></i>
          <span>Selfie wajah wajib untuk absen</span>
        </div>
      )}
      {err && <div className="scan-feedback err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="att-selfie-actions">
        {!live ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={startCam}>
            <i className="bi bi-camera-video"></i> Buka kamera
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-success btn-sm" onClick={snap}>
              <i className="bi bi-camera-fill"></i> Ambil selfie
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={stopCam}>Batal</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Attendance() {
  const { user, can } = useAuth()
  const shopCode = getAttendanceBarcode()
  const employees = useMemo(() => getUsers().filter((u) => u.is_active), [])

  const [unlocked, setUnlocked] = useState(false)
  const [scanCode, setScanCode] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locErr, setLocErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
  const nextType = useMemo(() => peekNextAttendanceType(employeeId), [employeeId, reload])
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shopCode)}`

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  function unlockWithCode(raw) {
    const code = normalizeScanCode(raw)
    if (!code) return
    if (!isAttendanceBarcode(code)) {
      setFeedback({ type: 'err', text: `Barcode salah. Scan kode toko: ${ATTENDANCE_BARCODE}` })
      return
    }
    beepOk()
    setUnlocked(true)
    setScanCode('')
    setFeedback({ type: 'ok', text: 'Barcode toko valid. Lanjutkan isi form absensi.' })
    refreshLocation()
  }

  function submitScan(e) {
    e.preventDefault()
    unlockWithCode(scanCode)
  }

  async function refreshLocation() {
    setLocLoading(true)
    setLocErr('')
    try {
      const pos = await getGeoPosition()
      setLocation(pos)
    } catch (e) {
      setLocation(null)
      setLocErr(e.message || 'Lokasi gagal')
    } finally {
      setLocLoading(false)
    }
  }

  async function submitAttendance(e) {
    e.preventDefault()
    if (!unlocked) {
      setFeedback({ type: 'err', text: 'Scan barcode toko dulu.' })
      return
    }
    setSubmitting(true)
    let loc = location
    if (!loc) {
      try {
        loc = await getGeoPosition()
        setLocation(loc)
      } catch (err) {
        setFeedback({ type: 'err', text: err.message })
        setSubmitting(false)
        return
      }
    }
    const res = clockAttendance({
      userId: employeeId,
      barcode: shopCode,
      selfie,
      location: loc,
      actor: user,
      source: 'form',
    })
    setSubmitting(false)
    if (!res.ok) {
      setFeedback({ type: 'err', text: res.message })
      return
    }
    beepOk()
    setFeedback({ type: 'ok', text: res.message, punch: res.type })
    setSelfie(null)
    setEmployeeId('')
    setReload((n) => n + 1)
  }

  function mapsLink(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }

  return (
    <>
      <h1 className="page-title">Absensi Karyawan</h1>
      <p style={{ margin: '-12px 0 16px', color: '#666', fontSize: 13 }}>
        1 barcode toko · pilih nama · selfie · lokasi GPS
      </p>

      <div className="home-tip" style={{ marginTop: 0, marginBottom: 14 }}>
        <strong>Alur:</strong> Scan barcode toko <code>{shopCode}</code> → pilih nama pegawai → ambil selfie →
        pastikan GPS aktif → simpan. Scan pertama hari itu = <strong>Masuk</strong>, berikutnya = <strong>Pulang</strong>.
      </div>

      <div className="att-shop-code">
        <img src={qrUrl} alt={shopCode} width={140} height={140} />
        <div>
          <div className="att-shop-label">Barcode Absensi Toko</div>
          <div className="att-code">{shopCode}</div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666' }}>
            Satu kode untuk semua pegawai. Tempel di meja absensi atau scan dari layar ini.
          </p>
        </div>
      </div>

      {!unlocked ? (
        <form className="scan-bar" onSubmit={submitScan}>
          <div className="scan-bar-icon"><i className="bi bi-upc-scan"></i></div>
          <input
            ref={scanRef}
            type="text"
            className="form-control scan-input"
            placeholder={`Scan / ketik ${shopCode}`}
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!scanCode.trim()}>
            Buka
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCameraOpen(true)}>
            <i className="bi bi-camera"></i> Kamera
          </button>
        </form>
      ) : (
        <div className="scan-feedback ok" style={{ marginBottom: 12 }}>
          <i className="bi bi-shield-check"></i>
          Barcode toko sudah diverifikasi
          <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={() => setUnlocked(false)}>
            Kunci lagi
          </button>
        </div>
      )}

      {feedback && (
        <div className={`scan-feedback ${feedback.type === 'ok' ? 'ok' : 'err'} att-feedback`}>
          {feedback.type === 'ok' ? <i className="bi bi-check-circle-fill"></i> : <i className="bi bi-exclamation-circle-fill"></i>}
          <span>
            {feedback.text}
            {feedback.punch && (
              <span className={`att-punch-badge ${feedback.punch}`}>
                {feedback.punch === 'in' ? 'MASUK' : 'PULANG'}
              </span>
            )}
          </span>
        </div>
      )}

      {unlocked && (
        <form className="card att-form-card" onSubmit={submitAttendance}>
          <div className="card-header">
            <span>Form Absensi</span>
            {employeeId && (
              <span className={`badge ${nextType === 'in' ? 'badge-success' : 'badge-info'}`}>
                Akan tercatat: {nextType === 'in' ? 'MASUK' : 'PULANG'}
              </span>
            )}
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Nama pegawai *</label>
              <select
                className="form-control"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                <option value="">— Pilih pegawai —</option>
                {employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLE_LABEL[u.role_slug] || u.role_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Selfie *</label>
              <SelfieBox selfie={selfie} onCapture={setSelfie} onClear={() => setSelfie(null)} />
            </div>

            <div className="form-group">
              <label className="form-label">Lokasi GPS *</label>
              <div className="att-geo-box">
                {locLoading ? (
                  <span>Mengambil koordinat...</span>
                ) : location ? (
                  <>
                    <div><strong>Lat:</strong> {location.latitude.toFixed(6)}</div>
                    <div><strong>Lng:</strong> {location.longitude.toFixed(6)}</div>
                    {location.accuracy != null && (
                      <div><strong>Akurasi:</strong> ±{Math.round(location.accuracy)} m</div>
                    )}
                    <a href={mapsLink(location.latitude, location.longitude)} target="_blank" rel="noreferrer">
                      Buka di Google Maps
                    </a>
                  </>
                ) : (
                  <span style={{ color: '#b42318' }}>{locErr || 'Lokasi belum diambil'}</span>
                )}
                <button type="button" className="btn btn-outline btn-sm" onClick={refreshLocation} disabled={locLoading}>
                  <i className="bi bi-geo-alt"></i> {location ? 'Perbarui lokasi' : 'Ambil lokasi'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              style={{ width: '100%', justifyContent: 'center', padding: 12 }}
              disabled={submitting || !employeeId || !selfie}
            >
              <i className="bi bi-check2-circle"></i>{' '}
              {submitting ? 'Menyimpan...' : `Simpan Absen ${nextType === 'in' ? 'Masuk' : 'Pulang'}`}
            </button>
          </div>
        </form>
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
              unlockWithCode(code)
              setCameraOpen(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
