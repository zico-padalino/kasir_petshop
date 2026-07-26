import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const REGION_ID = 'pos-barcode-reader'

function pickBackCamera(cameras) {
  if (!cameras?.length) return null
  const back = cameras.find((c) =>
    /back|rear|environment|belakang|traseira|arrière/i.test(c.label || '')
  )
  return (back || cameras[cameras.length - 1]).id
}

function friendlyCameraError(err) {
  const msg = String(err?.message || err || '')
  const name = err?.name || ''

  if (!window.isSecureContext) {
    return 'Kamera hanya bisa dipakai di HTTPS. Buka URL dari Cloudflare Tunnel (https://….trycloudflare.com), jangan pakai http://IP:5173.'
  }
  if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(msg)) {
    return 'Akses kamera ditolak. Izinkan kamera di pengaturan browser HP, lalu buka ulang halaman.'
  }
  if (name === 'NotFoundError' || /not found|no camera|requested device/i.test(msg)) {
    return 'Kamera tidak ditemukan di perangkat ini.'
  }
  if (name === 'NotReadableError' || /in use|busy|readable/i.test(msg)) {
    return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera/video, lalu coba lagi.'
  }
  if (name === 'SecurityError' || /secure|https|insecure/i.test(msg)) {
    return 'Browser memblokir kamera karena koneksi tidak aman. Gunakan URL HTTPS dari Jalankan-Tunnel.bat.'
  }
  return 'Kamera tidak bisa dinyalakan. Pakai scanner USB atau ketik SKU/barcode di kolom scan.'
}

/**
 * Modal kamera untuk scan barcode / QR.
 * onScan(code) dipanggil tiap kode terbaca (parent yang putuskan tutup/lanjut).
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const scannerRef = useRef(null)
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(REGION_ID)
    scannerRef.current = scanner

    const config = {
      fps: 10,
      qrbox: { width: 260, height: 140 },
      aspectRatio: 1.777,
      rememberLastUsedCamera: true,
    }

    const onSuccess = (decoded) => {
      const code = String(decoded || '').trim()
      if (!code) return
      const now = Date.now()
      if (lastRef.current.code === code && now - lastRef.current.at < 1800) return
      lastRef.current = { code, at: now }
      onScanRef.current?.(code)
    }

    async function startWith(cameraConfig) {
      await scanner.start(cameraConfig, config, onSuccess, () => {})
    }

    async function start() {
      if (!window.isSecureContext) {
        if (!cancelled) setError(friendlyCameraError({ name: 'SecurityError' }))
        return
      }

      try {
        // Prefer kamera belakang lewat daftar perangkat (lebih andal di Android)
        let cameraId = null
        try {
          const cameras = await Html5Qrcode.getCameras()
          cameraId = pickBackCamera(cameras)
        } catch {
          cameraId = null
        }

        if (cameraId) {
          await startWith(cameraId)
        } else {
          await startWith({ facingMode: 'environment' })
        }

        if (!cancelled) setReady(true)
      } catch (firstErr) {
        // Fallback: coba kamera depan / default
        try {
          await startWith({ facingMode: 'user' })
          if (!cancelled) setReady(true)
        } catch (secondErr) {
          if (!cancelled) setError(friendlyCameraError(secondErr || firstErr))
        }
      }
    }

    // Tunggu frame agar elemen #REGION_ID sudah di DOM (penting di HP)
    const t = setTimeout(() => {
      start()
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(t)
      const s = scannerRef.current
      scannerRef.current = null
      if (s?.isScanning) {
        s.stop().catch(() => {}).finally(() => {
          try { s.clear() } catch { /* ignore */ }
        })
      } else {
        try { s?.clear() } catch { /* ignore */ }
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
        <p className="scan-modal-hint">Arahkan kamera ke barcode / QR / label kode barang</p>
        <div id={REGION_ID} className="scan-reader" />
        {!ready && !error && <div className="scan-status">Menyalakan kamera...</div>}
        {error && (
          <div className="alert-custom alert-danger" style={{ marginTop: 12 }}>
            <div className="alert-body">
              <strong>Kamera gagal</strong>
              {error}
            </div>
          </div>
        )}
        <p className="scan-modal-tip">
          Harus buka via <strong>HTTPS</strong> (URL dari <code>Jalankan-Tunnel.bat</code>).
          Alternatif: ketik SKU (mis. <code>MK-001</code>) atau barcode di kolom scan.
        </p>
      </div>
    </div>
  )
}
