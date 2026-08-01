import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

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
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

const FORMATS_NATIVE = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'codabar',
  'itf', 'qr_code', 'data_matrix',
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

/**
 * Scanner dengan 3 cara:
 * 1) Live kamera
 * 2) Ambil / pilih foto (paling andal di banyak HP)
 * 3) Ketik manual (via parent)
 */
export default function BarcodeScanner({ onScan, onClose, lastFeedback }) {
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(0)
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [mode, setMode] = useState('photo') // 'photo' | 'live' — default foto (lebih andal)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [lastCode, setLastCode] = useState('')
  const [status, setStatus] = useState('Pilih foto barcode kemasan')
  const [manual, setManual] = useState('')

  function emit(code) {
    const c = String(code || '').trim()
    if (!c) return false
    const now = Date.now()
    if (lastRef.current.code === c && now - lastRef.current.at < 1200) return true
    lastRef.current = { code: c, at: now }
    setLastCode(c)
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
    setStatus('Membaca barcode dari foto…')
    try {
      // 1) Native BarcodeDetector dari bitmap
      if (typeof window.BarcodeDetector === 'function') {
        try {
          const bmp = await createImageBitmap(file)
          const detector = new window.BarcodeDetector({ formats: FORMATS_NATIVE })
          const codes = await detector.detect(bmp)
          bmp.close?.()
          if (codes?.length) {
            emit(codes[0].rawValue)
            return
          }
        } catch {
          // lanjut fallback
        }
      }

      // 2) html5-qrcode scanFile
      const scanner = new Html5Qrcode('file-scan-region', {
        formatsToSupport: FORMATS_HTML5,
        verbose: false,
      })
      try {
        const decoded = await scanner.scanFile(file, true)
        if (decoded) {
          emit(decoded)
          return
        }
      } finally {
        try { scanner.clear() } catch { /* ignore */ }
      }

      setError('Barcode tidak terbaca dari foto. Foto ulang lebih dekat & terang, atau ketik angka manual.')
      setStatus('Gagal membaca foto')
    } catch (err) {
      setError(err?.message || 'Gagal membaca foto.')
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

  // Live camera mode
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
        // Coba html5-qrcode live (lebih fokus untuk beberapa HP)
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
          setStatus('Live kamera aktif — dekatkan barcode')
        }
      } catch (err) {
        // Fallback getUserMedia + BarcodeDetector
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          streamRef.current = stream
          const video = videoRef.current
          video.srcObject = stream
          await video.play()
          setReady(true)
          setStatus('Live kamera aktif')

          if (typeof window.BarcodeDetector === 'function') {
            const detector = new window.BarcodeDetector({ formats: FORMATS_NATIVE })
            const tick = async () => {
              if (cancelled) return
              try {
                if (video.readyState >= 2) {
                  const codes = await detector.detect(video)
                  if (codes?.length) emit(codes[0].rawValue)
                }
              } catch { /* ignore */ }
              timerRef.current = window.setTimeout(tick, 150)
            }
            tick()
          } else {
            setError('HP ini kurang cocok untuk live scan. Pakai mode Foto.')
          }
        } catch (e2) {
          setError(e2?.message || 'Kamera live gagal. Pakai mode Foto.')
          setStatus('Gagal')
        }
      }
    }

    startLive()

    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
      streamRef.current?.getTracks()?.forEach((t) => t.stop())
      streamRef.current = null
      if (html5?.isScanning) {
        html5.stop().catch(() => {}).finally(() => {
          try { html5.clear() } catch { /* ignore */ }
        })
      }
    }
  }, [mode])

  function submitManual(e) {
    e.preventDefault()
    if (!manual.trim()) return
    emit(manual.trim())
    setManual('')
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box scan-modal">
        <div className="scan-modal-head">
          <h3 style={{ margin: 0 }}><i className="bi bi-upc-scan"></i> Scan Barang</h3>
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Tutup</button>
        </div>

        <div className="scan-mode-tabs">
          <button
            type="button"
            className={`category-tab ${mode === 'photo' ? 'active' : ''}`}
            onClick={() => setMode('photo')}
          >
            📷 Foto (disarankan)
          </button>
          <button
            type="button"
            className={`category-tab ${mode === 'live' ? 'active' : ''}`}
            onClick={() => setMode('live')}
          >
            📹 Live kamera
          </button>
        </div>

        <p className="scan-modal-hint">{status}</p>

        {mode === 'photo' ? (
          <div className="scan-photo-box">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onFileChange}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <i className="bi bi-camera-fill"></i>
              {busy ? ' Membaca…' : ' Ambil / Pilih Foto Barcode'}
            </button>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#666', textAlign: 'center' }}>
              Foto barcode dari dekat, fokus, dan terang — biasanya lebih akurat daripada live scan.
            </p>
            <div id="file-scan-region" style={{ width: 1, height: 1, overflow: 'hidden' }} />
          </div>
        ) : (
          <div className="scan-reader scan-reader-native">
            <video ref={videoRef} playsInline muted autoPlay className="scan-video" />
            <div id="live-reader" className="scan-fallback-reader" />
            <div className="scan-overlay-frame" />
          </div>
        )}

        {mode === 'live' && ready && !lastCode && (
          <div className="scan-pulse">Memindai live…</div>
        )}

        <form onSubmit={submitManual} className="scan-manual-row">
          <input
            type="text"
            className="form-control"
            placeholder="Atau ketik barcode / SKU lalu Enter"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="text"
          />
          <button type="submit" className="btn btn-success btn-sm" disabled={!manual.trim()}>
            OK
          </button>
        </form>

        {error && (
          <div className="alert-custom alert-danger" style={{ marginTop: 12 }}>
            <div className="alert-body"><strong>Info</strong>{error}</div>
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

        <p className="scan-modal-tip">
          <strong>Solusi lain jika kamera sulit:</strong>
          <br />1. Mode <strong>Foto</strong> (tombol di atas)
          <br />2. Ketik barcode/SKU di kotak input
          <br />3. Scanner USB/Bluetooth (tembak ke kolom scan kasir)
        </p>
      </div>
    </div>
  )
}
