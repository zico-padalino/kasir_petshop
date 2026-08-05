import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  clockAttendance,
  getAttendanceBarcode,
  getUsers,
  peekNextAttendanceType,
} from '../db/store'
import { useAuth } from '../context/AuthContext'
import { isAttendanceUnlocked, unlockAttendanceSession, clearAttendanceSession } from '../utils/attendanceSession'

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
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
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

export default function AttendanceForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shopCode = getAttendanceBarcode()
  const employees = useMemo(() => getUsers().filter((u) => u.is_active), [])

  const [ready, setReady] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locErr, setLocErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const nextType = useMemo(() => peekNextAttendanceType(employeeId), [employeeId])

  useEffect(() => {
    const fromQr = searchParams.get('unlock') === '1'
    if (fromQr) unlockAttendanceSession()
    if (!isAttendanceUnlocked() && !fromQr) {
      navigate('/attendance', { replace: true })
      return
    }
    if (fromQr) {
      navigate('/attendance/form', { replace: true })
    }
    setReady(true)
    refreshLocation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

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
    // setelah sukses, kembali ke daftar absensi
    setTimeout(() => {
      clearAttendanceSession()
      navigate('/attendance')
    }, 1200)
  }

  function mapsLink(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }

  if (!ready) return null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <Link to="/attendance" className="btn btn-outline btn-sm" onClick={() => clearAttendanceSession()}>
          <i className="bi bi-arrow-left"></i> Kembali
        </Link>
        <h1 className="page-title" style={{ margin: 0 }}>Form Absensi</h1>
      </div>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13 }}>
        Barcode toko sudah diverifikasi · pilih nama, selfie, dan lokasi
      </p>

      <div className="scan-feedback ok" style={{ marginBottom: 14 }}>
        <i className="bi bi-shield-check"></i>
        Akses absensi aktif ({shopCode})
      </div>

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

      <form className="card att-form-card" onSubmit={submitAttendance}>
        <div className="card-header">
          <span>Isi data absen</span>
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
    </>
  )
}
