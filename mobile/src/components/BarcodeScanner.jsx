import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { decodeBarcodeFromFile } from '../utils/decodeBarcode'

const FORMATS_HTML5 = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
]

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 980
    g.gain.value = 0.1
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => { o.stop(); ctx.close() }, 70)
  } catch { /* ignore */ }
}

export default function BarcodeScanner({ onScan, onClose, lastFeedback }) {
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(0)
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [mode, setMode] = useState('photo')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [lastCode, setLastCode] = useState('')
  const [preview, setPreview] = useState('')
  const [status, setStatus] = useState('Ambil foto barcode dari dekat')
  const [manual, setManual] = useState('')

  function emit(code) {
    const c = String(code || '').trim()
    if (!c) return false
    const now = Date.now()
    if (lastRef.current.code === c && now - lastRef.current.at < 1200) return true
    lastRef.current = { code: c, at: now }
    setLastCode(c)
    setManual(c)
    setStatus('Kode terbaca!')
    setError('')
    beep()
    try { navigator.vibrate?.([40, 30, 40]) } catch { /* ignore */ }
    onScanRef.current?.(c)
    return true
  }

  async function decodeFile(file) {
    setBusy(true)
    setError('')
    setStatus('Memproses foto (bisa 5–15 detik)…')
    try {
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(file))
    } catch { /* ignore */ }

    try {
      const code = await decodeBarcodeFromFile(file)
      if (code) {
        emit(code)
      } else {
        setError(
          'Barcode di foto tidak terbaca. Tips: foto hanya bagian barcode, tegak lurus, terang, tidak buram. Atau ketik angka di bawah barcode secara manual.'
        )
        setStatus('Tidak terbaca — ketik manual')
      }
    } catch (err) {
      setError(err?.message || 'Gagal memproses foto.')
      setStatus('Gagal')
    } finally {
      setBusy(false)
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) decodeFile(file)
  }

  useEffect(() => {
    if (mode !== 'live') return undefined
    let cancelled = false
    let html5 = null

    async function startLive() {
      setError('')
      setReady(false)
      setStatus('Menyalakan kamera…')
      if (!window.isSecureContext) {
        setError('Butuh HTTPS (Jalankan-Tunnel.bat).')
        return
      }
      try {
        html5 = new Html5Qrcode('live-reader', {
          formatsToSupport: FORMATS_HTML5,
          verbose: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        })
        const cams = await Html5Qrcode.getCameras()
        const back = cams.find((c) => /back|rear|environment/i.test(c.label || ''))
        const id = (back || cams[cams.length - 1])?.id
        await html5.start(
          id || { facingMode: 'environment' },
          { fps: 12, aspectRatio: 1.333 },
          (decoded) => emit(decoded),
          () => {}
        )
        if (!cancelled) {
          setReady(true)
          setStatus('Live kamera — dekatkan barcode')
        }
      } catch (err) {
        setError('Live kamera gagal di HP ini. Pakai mode Foto atau ketik manual.')
        setStatus('Gagal live')
      }
    }

    startLive()
    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
      streamRef.current?.getTracks()?.forEach((t) => t.stop())
      if (html5?.isScanning) {
        html5.stop().catch(() => {}).finally(() => {
          try { html5.clear() } catch { /* ignore */ }
        })
      }
    }
  }, [mode])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function submitManual(e) {
    e.preventDefault()
    if (!manual.trim()) return
    emit(manual.trim())
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box scan-modal">
        <div className="scan-modal-head">
          <h3 style={{ margin: 0 }}><i className="bi bi-upc-scan"></i> Scan Barang</h3>
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Tutup</button>
        </div>

        <div className="scan-mode-tabs">
          <button type="button" className={`category-tab ${mode === 'photo' ? 'active' : ''}`} onClick={() => setMode('photo')}>
            📷 Foto
          </button>
          <button type="button" className={`category-tab ${mode === 'live' ? 'active' : ''}`} onClick={() => setMode('live')}>
            📹 Live
          </button>
        </div>

        <p className="scan-modal-hint">{status}</p>

        {mode === 'photo' ? (
          <div className="scan-photo-box">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFileChange} />
            {preview && (
              <img src={preview} alt="Preview" className="scan-photo-preview" />
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <i className="bi bi-camera-fill"></i>
              {busy ? ' Membaca foto…' : ' Ambil / Pilih Foto Barcode'}
            </button>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#666', textAlign: 'center' }}>
              Foto <strong>hanya bagian barcode</strong> (garis hitam + angka), jarak dekat, fokus tajam.
            </p>
          </div>
        ) : (
          <div className="scan-reader scan-reader-native">
            <video ref={videoRef} playsInline muted autoPlay className="scan-video" />
            <div id="live-reader" className="scan-fallback-reader" />
            <div className="scan-overlay-frame" />
          </div>
        )}

        <div className="scan-manual-block">
          <div className="scan-manual-title">Ketik manual (paling pasti)</div>
          <form onSubmit={submitManual} className="scan-manual-row">
            <input
              type="text"
              className="form-control"
              placeholder="Angka di bawah barcode / SKU"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-success" disabled={!manual.trim()}>
              Pakai
            </button>
          </form>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
            Lihat angka di bawah garis barcode kemasan, ketik di sini, lalu tekan <strong>Pakai</strong>.
          </p>
        </div>

        {error && (
          <div className="alert-custom alert-danger" style={{ marginTop: 12 }}>
            <div className="alert-body"><strong>Belum terbaca</strong>{error}</div>
          </div>
        )}

        {lastCode && (
          <div className="scan-last-code">
            Terbaca: <code>{lastCode}</code>
          </div>
        )}

        {lastFeedback && (
          <div className={`scan-feedback ${lastFeedback.type === 'ok' ? 'ok' : 'err'}`} style={{ marginTop: 8 }}>
            {lastFeedback.type === 'ok'
              ? <i className="bi bi-check-circle-fill"></i>
              : <i className="bi bi-exclamation-circle-fill"></i>}
            {lastFeedback.text}
          </div>
        )}
      </div>
    </div>
  )
}
