import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const REGION_ID = 'pos-barcode-reader'

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

    async function start() {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 140 }, aspectRatio: 1.777 },
          (decoded) => {
            const code = String(decoded || '').trim()
            if (!code) return
            const now = Date.now()
            // hindari double-fire kamera yang sama
            if (lastRef.current.code === code && now - lastRef.current.at < 1800) return
            lastRef.current = { code, at: now }
            onScanRef.current?.(code)
          },
          () => {}
        )
        if (!cancelled) setReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
              ? 'Izinkan akses kamera di browser, lalu coba lagi.'
              : 'Kamera tidak tersedia. Pakai scanner USB atau ketik kode di kolom scan.'
          )
        }
      }
    }

    start()

    return () => {
      cancelled = true
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
        {error && <div className="alert-custom alert-danger" style={{ marginTop: 12 }}>{error}</div>}
        <p className="scan-modal-tip">Tip uji coba: ketik SKU (mis. <code>MK-001</code>) atau barcode di kolom scan kasir.</p>
      </div>
    </div>
  )
}
