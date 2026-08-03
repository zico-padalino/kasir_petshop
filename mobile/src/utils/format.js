export function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

// Rp 185.000 (tanpa desimal, titik ribuan) - sama dengan number_format($v,0,',','.')
export function rupiah(n) {
  return 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID')
}

/** Ambil angka murni dari string rupiah (hapus titik/spasi/Rp) */
export function parseRupiah(str) {
  const digits = String(str ?? '').replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits)
}

/** Format angka ke tampilan input: 185000 → 185.000 */
export function formatRupiahInput(n) {
  const num = Math.round(Number(n) || 0)
  if (!num) return ''
  return num.toLocaleString('id-ID')
}

/**
 * Hitung nominal diskon dari nilai + tipe.
 * type: 'rp' | 'percent'
 */
export function calcDiscountAmount(subtotal, value, type = 'rp') {
  const base = Math.max(0, Number(subtotal) || 0)
  const v = Number(value) || 0
  if (type === 'percent') {
    const pct = Math.min(100, Math.max(0, v))
    return Math.round((base * pct) / 100)
  }
  return Math.min(base, Math.max(0, Math.round(v)))
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function parse(iso) {
  // format simpanan: "YYYY-MM-DD HH:mm:ss"
  if (!iso) return null
  const [d, t = '00:00:00'] = iso.split(' ')
  const [y, mo, day] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  return { y, mo, day, h, mi }
}

const pad = (n) => String(n).padStart(2, '0')

// d/m/Y H:i
export function dateTimeShort(iso) {
  const p = parse(iso)
  if (!p) return '-'
  return `${pad(p.day)}/${pad(p.mo)}/${p.y} ${pad(p.h)}:${pad(p.mi)}`
}

// d/m/Y
export function dateShort(iso) {
  const p = parse(iso)
  if (!p) return '-'
  return `${pad(p.day)}/${pad(p.mo)}/${p.y}`
}

// d F Y, H:i
export function dateLong(iso) {
  const p = parse(iso)
  if (!p) return '-'
  return `${p.day} ${MONTHS[p.mo - 1]} ${p.y}, ${pad(p.h)}:${pad(p.mi)}`
}

export function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function monthStartInput() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}
