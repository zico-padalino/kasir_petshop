import { useMemo, useState, useRef } from 'react'
import { getShopSettings, saveShopSettings } from '../db/store'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function compressLogo(file, maxW = 280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Gagal membaca gambar.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })
}

export default function ShopSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const initial = useMemo(() => getShopSettings(), [])
  const [form, setForm] = useState({
    shop_name: initial.shop_name,
    receipt_name: initial.receipt_name,
    tagline: initial.tagline,
    address: initial.address,
    phone: initial.phone,
    receipt_footer: initial.receipt_footer,
    receipt_note: initial.receipt_note,
    logo: initial.logo,
  })
  const [busy, setBusy] = useState(false)

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onLogoPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar.')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await compressLogo(file)
      set('logo', dataUrl)
      toast.success('Logo siap. Klik Simpan untuk menerapkan.')
    } catch (err) {
      toast.error(err.message || 'Gagal memproses logo.')
    } finally {
      setBusy(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const res = saveShopSettings(form, user)
    if (res.ok) toast.success(res.message)
    else toast.error(res.message)
  }

  const previewName = form.receipt_name || form.shop_name || 'Nama Toko'

  return (
    <>
      <h1 className="page-title">Pengaturan Toko & Struk</h1>
      <p style={{ margin: '-12px 0 16px', color: '#666', fontSize: 13 }}>
        Atur nama toko, logo, dan teks yang tampil di struk
      </p>

      <div className="side-form-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="card">
          <div className="card-header"><span>Data toko</span></div>
          <div className="card-body">
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Nama toko (aplikasi) *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.shop_name}
                  onChange={(e) => set('shop_name', e.target.value)}
                  placeholder="pet Shop"
                  required
                />
                <small style={{ color: '#888', fontSize: 12 }}>Tampil di menu, beranda, dan login</small>
              </div>

              <div className="form-group">
                <label className="form-label">Nama di struk *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.receipt_name}
                  onChange={(e) => set('receipt_name', e.target.value)}
                  placeholder="pet Shop"
                  required
                />
                <small style={{ color: '#888', fontSize: 12 }}>Judul di bagian atas struk cetak</small>
              </div>

              <div className="form-group">
                <label className="form-label">Tagline / slogan</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                  placeholder="Toko & penitipan hewan"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat (struk)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Jl. ..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telepon (struk)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="0812-...."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Logo toko</label>
                <div className="shop-logo-row">
                  <div className="shop-logo-preview">
                    {form.logo ? (
                      <img src={form.logo} alt="Logo" />
                    ) : (
                      <span>🐾</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogoPick} />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <i className="bi bi-image"></i> {busy ? 'Memproses...' : 'Unggah logo'}
                    </button>
                    {form.logo && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => set('logo', null)}>
                        Hapus logo
                      </button>
                    )}
                  </div>
                </div>
                <small style={{ color: '#888', fontSize: 12 }}>Disarankan PNG/JPG, otomatis diperkecil</small>
              </div>

              <div className="form-group">
                <label className="form-label">Ucapan bawah struk</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.receipt_footer}
                  onChange={(e) => set('receipt_footer', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan struk</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.receipt_note}
                  onChange={(e) => set('receipt_note', e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <i className="bi bi-check-lg"></i> Simpan pengaturan
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header"><span>Pratinjau struk</span></div>
            <div className="card-body">
              <div className="shop-receipt-preview">
                {form.logo ? (
                  <img src={form.logo} alt="" className="shop-receipt-logo" />
                ) : (
                  <div className="shop-receipt-emoji">🐾</div>
                )}
                <div className="shop-receipt-name">{previewName}</div>
                {form.address && <div className="shop-receipt-meta">{form.address}</div>}
                {form.phone && <div className="shop-receipt-meta">Telp: {form.phone}</div>}
                <div className="shop-receipt-line" />
                <div className="shop-receipt-meta">No. Invoice · INV-XXXX</div>
                <div className="shop-receipt-line" />
                <div className="shop-receipt-meta" style={{ marginTop: 8 }}>{form.receipt_footer}</div>
                <div className="shop-receipt-meta" style={{ fontSize: 10 }}>{form.receipt_note}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
