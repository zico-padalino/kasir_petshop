import { useEffect, useRef, useState } from 'react'

const FORMATS = [
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
 * Scanner kamera — utamakan BarcodeDetector native (Chrome Android),
 * fallback html5-qrcode. Cloudflare tunnel TIDAK menghalangi deteksi.
 */
export default function BarcodeScanner({ onScan, onClose, lastFeedback }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [lastCode, setLastCode] = useState('')
  const [status, setStatus] = useState('Menyalakan kamera…')
  const [engine, setEngine] = useState('')

  useEffect(() => {
    let cancelled = false
    let html5Scanner = null

    function emit(code) {
      const c = String(code || '').trim()
      if (!c) return
      const now = Date.now()
      if (lastRef.current.code === c && now - lastRef.current.at < 1500) return
      lastRef.current = { code: c, at: now }
      setLastCode(c)
      setStatus('Kode terbaca!')
      beep()
      try { navigator.vibrate?.([40, 30, 40]) } catch { /* ignore */ }
      onScanRef.current?.(c)
    }

    async function startNative(stream) {
      if (typeof window.BarcodeDetector !== 'function') return false
      let detector
      try {
        detector = new window.BarcodeDetector({ formats: FORMATS })
      } catch {
        try {
          detector = new window.BarcodeDetector()
        } catch {
          return false
        }
      }

      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      streamRef.current = stream
      if (cancelled) return true

      setReady(true)
      setEngine('native')
      setStatus('Arahkan barcode ke tengah — sedang memindai…')

      const tick = async () => {
        if (cancelled) return
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video)
            if (codes?.length) {
              emit(codes[0].rawValue)
            }
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = window.setTimeout(tick, 120)
      }
      tick()
      return true
    }

    async function startHtml5(stream) {
      // hentikan stream native dulu; html5-qrcode ambil kamera sendiri
      stream.getTracks().forEach((t) => t.stop())

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      const formats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ]

      // pakai elemen video kita: html5 butuh div id
      const region = document.getElementById('fallback-reader')
      if (!region) return false

      html5Scanner = new Html5Qrcode('fallback-reader', {
        formatsToSupport: formats,
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      })

      const cameras = await Html5Qrcode.getCameras()
      const back = cameras.find((c) => /back|rear|environment/i.test(c.label || ''))
      const camId = (back || cameras[cameras.length - 1])?.id

      await html5Scanner.start(
        camId || { facingMode: 'environment' },
        { fps: 15, aspectRatio: 1.333 },
        (decoded) => emit(decoded),
        () => {}
      )

      if (!cancelled) {
        setReady(true)
        setEngine('html5')
        setStatus('Arahkan barcode ke tengah — sedang memindai…')
        // sembunyikan video native
        if (videoRef.current) videoRef.current.style.display = 'none'
      }
      return true
    }

    async function boot() {
      if (!window.isSecureContext) {
        setError('Harus HTTPS (URL dari Jalankan-Tunnel.bat). Cloudflare tunnel justru yang benar.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: 'continuous',
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const okNative = await startNative(stream)
        if (!okNative && !cancelled) {
          setStatus('Beralih ke mode cadangan…')
          await startHtml5(stream)
        }
      } catch (err) {
        if (cancelled) return
        const name = err?.name || ''
        if (name === 'NotAllowedError') {
          setError('Izinkan akses kamera di browser, lalu buka ulang.')
        } else {
          setError(err?.message || 'Kamera gagal dinyalakan.')
        }
      }
    }

    const t = setTimeout(boot, 200)

    return () => {
      cancelled = true
      clearTimeout(t)
      clearTimeout(rafRef.current)
      streamRef.current?.getTracks()?.forEach((tr) => tr.stop())
      if (html5Scanner?.isScanning) {
        html5Scanner.stop().catch(() => {}).finally(() => {
          try { html5Scanner.clear() } catch { /* ignore */ }
        })
      }
    }
  }, [])

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box scan-modal">
        <div className="scan-modal-head">
          <h3 style={{ margin: 0 }}><i className="bi bi-upc-scan"></i> Scan Barang</h3>
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Tutup</button>
        </div>

        <p className="scan-modal-hint">
          {status}
          {engine ? <span style={{ opacity: 0.6 }}> · {engine}</span> : null}
        </p>

        <div className="scan-reader scan-reader-native">
          <video ref={videoRef} playsInline muted autoPlay className="scan-video" />
          <div className="scan-overlay-frame" />
          <div id="fallback-reader" className="scan-fallback-reader" />
        </div>

        {ready && !lastCode && (
          <div className="scan-pulse">Memindai… dekatkan barcode</div>
        )}

        {error && (
          <div className="alert-custom alert-danger" style={{ marginTop: 12 }}>
            <div className="alert-body"><strong>Gagal</strong>{error}</div>
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
          <strong>Cloudflare tunnel bukan masalah</strong> — justru dibutuhkan agar kamera boleh hidup.
          <br />
          Pakai <strong>Chrome Android</strong> (paling andal). Dekatkan barcode, isi layar, tahan 2 detik.
          <br />
          Cadangan: tutup kamera, ketik SKU di kolom scan (mis. <code>MK-006</code>).
        </p>
      </div>
    </div>
  )
}
