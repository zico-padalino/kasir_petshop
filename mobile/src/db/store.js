// "Database" lokal berbasis localStorage (tersimpan di perangkat, untuk uji coba).
// Meniru struktur tabel & logika controller pada versi Laravel.

import { buildSeed } from './seed'

const DB_KEY = 'kasir_dzikra_db_v3'

export const BRAND_NAME = 'pet Shop'

function normalizeBrandName(value, fallback = BRAND_NAME) {
  const text = String(value || '').trim()
  if (!text || /dzikra/i.test(text)) return fallback
  return text
}

function ensureSchema(db) {
  if (!db.hotel_rooms || !db.hotel_bookings) {
    const fresh = buildSeed()
    db.hotel_rooms = fresh.hotel_rooms
    db.hotel_bookings = db.hotel_bookings || fresh.hotel_bookings
  }
  if (!db.stock_opnames) {
    const fresh = buildSeed()
    db.stock_opnames = fresh.stock_opnames || []
    db.stock_opname_items = fresh.stock_opname_items || []
  }
  if (!db.stock_opname_items) db.stock_opname_items = []
  if (!db.activity_logs) {
    const fresh = buildSeed()
    db.activity_logs = fresh.activity_logs || []
  }
  if (!Array.isArray(db.attendance_logs)) {
    const fresh = buildSeed()
    db.attendance_logs = fresh.attendance_logs || []
  } else if (!db.attendance_logs.length) {
    // isi contoh sekali untuk DB lama yang belum punya data absensi
    try {
      const flag = localStorage.getItem('kasir_dzikra_att_seeded')
      if (!flag) {
        const fresh = buildSeed()
        if (fresh.attendance_logs?.length) {
          db.attendance_logs = fresh.attendance_logs
          localStorage.setItem('kasir_dzikra_att_seeded', '1')
        }
      }
    } catch { /* ignore */ }
  }
  if (!Array.isArray(db.held_orders)) db.held_orders = []
  if (!db.cash_drawer || !Array.isArray(db.cash_movements)) {
    migrateCashDrawer(db)
  }
  if (!db.attendance_settings || typeof db.attendance_settings !== 'object') {
    db.attendance_settings = {
      label: 'PetShop Dzikra',
      latitude: null,
      longitude: null,
      radius_m: 100,
      enforce: false,
      updated_at: null,
    }
  } else {
    if (db.attendance_settings.radius_m == null) db.attendance_settings.radius_m = 100
    if (typeof db.attendance_settings.enforce !== 'boolean') db.attendance_settings.enforce = false
    if (db.attendance_settings.label == null) db.attendance_settings.label = 'PetShop Dzikra'
  }
  if (!db.shop_settings || typeof db.shop_settings !== 'object') {
    db.shop_settings = {
      shop_name: 'pet Shop',
      receipt_name: 'pet Shop',
      tagline: 'Toko & penitipan hewan',
      address: 'Jl. Pet Shop No. 1, Indonesia',
      phone: '0812-3456-7890',
      receipt_footer: 'Terima kasih atas kunjungan Anda!',
      receipt_note: 'Barang yang sudah dibeli tidak dapat ditukar',
      logo: null,
      updated_at: null,
    }
  } else {
    db.shop_settings.shop_name = normalizeBrandName(db.shop_settings.shop_name)
    db.shop_settings.receipt_name = normalizeBrandName(
      db.shop_settings.receipt_name,
      db.shop_settings.shop_name
    )
    if (db.shop_settings.logo === undefined) db.shop_settings.logo = null
  }
  // pastikan tiap produk punya barcode (untuk scan kasir)
  if (Array.isArray(db.products)) {
    db.products.forEach((p, i) => {
      if (!p.barcode) {
        p.barcode = `8991001${String(p.id || i + 1).padStart(6, '0')}`
      }
      if (p.photo === undefined) p.photo = null
    })
  }
  // barcode device karyawan untuk absensi
  if (Array.isArray(db.users)) {
    db.users.forEach((u) => {
      if (!u.device_barcode) {
        u.device_barcode = `DEV-${String(u.id).padStart(6, '0')}`
      }
    })
  }
  return db
}

function load() {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const old = localStorage.getItem('kasir_dzikra_db_v2')
    if (old) {
      try {
        const migrated = ensureSchema(JSON.parse(old))
        if (!migrated.hotel_bookings?.length) {
          const fresh = buildSeed()
          migrated.hotel_rooms = fresh.hotel_rooms
          migrated.hotel_bookings = fresh.hotel_bookings
        }
        if (!migrated.stock_opnames?.length) {
          const fresh = buildSeed()
          migrated.stock_opnames = fresh.stock_opnames
          migrated.stock_opname_items = fresh.stock_opname_items
        }
        if (!migrated.activity_logs?.length) {
          const fresh = buildSeed()
          migrated.activity_logs = fresh.activity_logs
        }
        localStorage.setItem(DB_KEY, JSON.stringify(migrated))
        return migrated
      } catch { /* fall through */ }
    }
    const fresh = buildSeed()
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
    return fresh
  }
  try {
    const parsed = JSON.parse(raw)
    const beforeName = parsed?.shop_settings?.shop_name
    const beforeReceipt = parsed?.shop_settings?.receipt_name
    const db = ensureSchema(parsed)
    if (
      db?.shop_settings?.shop_name !== beforeName ||
      db?.shop_settings?.receipt_name !== beforeReceipt
    ) {
      localStorage.setItem(DB_KEY, JSON.stringify(db))
    }
    return db
  } catch {
    const fresh = buildSeed()
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
    return fresh
  }
}

function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

/** Migrasi / inisialisasi uang kasir dari penjualan tunai yang sudah ada */
function migrateCashDrawer(db) {
  if (db.cash_drawer && Array.isArray(db.cash_movements)) return

  let balance = 0
  const movements = []
  let id = 1
  const cashSales = (db.transactions || [])
    .filter((t) => t.payment_method === 'cash' && Number(t.total) > 0)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  for (const t of cashSales) {
    const amt = Math.round(Number(t.total) || 0)
    if (amt <= 0) continue
    balance += amt
    movements.push({
      id: id++,
      type: 'sale_cash',
      amount: amt,
      direction: 'in',
      balance_after: balance,
      note: `Penjualan tunai ${t.invoice_number}`,
      reference: t.invoice_number,
      user_id: t.user_id ?? null,
      created_at: t.created_at,
    })
  }

  db.cash_drawer = { balance, updated_at: nowIso() }
  db.cash_movements = movements
}

/**
 * Catat pergerakan uang kasir.
 * type: cash_in | cash_out | sale_cash | hotel_cash
 */
function applyCashMovement(db, { type, amount, note = null, reference = null, user = null, created_at = null }) {
  if (!db.cash_drawer) db.cash_drawer = { balance: 0, updated_at: nowIso() }
  if (!Array.isArray(db.cash_movements)) db.cash_movements = []

  const amt = Math.round(Number(amount) || 0)
  if (amt <= 0) return { ok: false, message: 'Nominal harus lebih dari 0.' }

  const isOut = type === 'cash_out'
  if (isOut && db.cash_drawer.balance < amt) {
    return { ok: false, message: `Saldo kas tidak cukup. Saldo saat ini ${Math.round(db.cash_drawer.balance).toLocaleString('id-ID')}.` }
  }

  const signed = isOut ? -amt : amt
  db.cash_drawer.balance = Math.round((Number(db.cash_drawer.balance) || 0) + signed)
  db.cash_drawer.updated_at = nowIso()

  const movement = {
    id: nextId(db.cash_movements),
    type,
    amount: amt,
    direction: isOut ? 'out' : 'in',
    balance_after: db.cash_drawer.balance,
    note: note ? String(note).trim() : null,
    reference: reference || null,
    user_id: user?.id ?? null,
    created_at: created_at || nowIso(),
  }
  db.cash_movements.push(movement)
  return { ok: true, movement, balance: db.cash_drawer.balance }
}

export function getCashDrawer() {
  const db = load()
  const today = todayStr()
  const movs = db.cash_movements || []
  const todayMovs = movs.filter((m) => String(m.created_at || '').startsWith(today))
  const sumBy = (pred) => todayMovs.filter(pred).reduce((s, m) => s + (Number(m.amount) || 0), 0)

  return {
    balance: Math.round(Number(db.cash_drawer?.balance) || 0),
    updated_at: db.cash_drawer?.updated_at || null,
    today: {
      cash_in: sumBy((m) => m.type === 'cash_in'),
      cash_out: sumBy((m) => m.type === 'cash_out'),
      sales: sumBy((m) => m.type === 'sale_cash'),
      hotel: sumBy((m) => m.type === 'hotel_cash'),
    },
  }
}

export function getCashMovements({ limit = 100 } = {}) {
  const db = load()
  return [...(db.cash_movements || [])]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit)
    .map((m) => {
      const u = db.users.find((x) => x.id === m.user_id)
      return { ...m, user_name: u?.name || '-' }
    })
}

/** Setor / masukkan uang ke laci kasir */
export function cashIn({ amount, note = '' }, currentUser = null) {
  const db = load()
  const res = applyCashMovement(db, {
    type: 'cash_in',
    amount,
    note: note || 'Setor uang kasir',
    user: currentUser,
  })
  if (!res.ok) return res
  pushLog(db, {
    user: currentUser,
    action: 'cash_in',
    module: 'cash',
    description: `${currentUser?.name || 'Kasir'} setor uang kas Rp ${Math.round(amount).toLocaleString('id-ID')}`,
    meta: { amount: Math.round(Number(amount) || 0) },
  })
  save(db)
  return { ok: true, message: `Berhasil setor ${Math.round(amount).toLocaleString('id-ID')}. Saldo: ${res.balance.toLocaleString('id-ID')}`, balance: res.balance }
}

/** Keluarkan uang dari laci kasir */
export function cashOut({ amount, note = '' }, currentUser = null) {
  const db = load()
  const res = applyCashMovement(db, {
    type: 'cash_out',
    amount,
    note: note || 'Tarik uang kasir',
    user: currentUser,
  })
  if (!res.ok) return res
  pushLog(db, {
    user: currentUser,
    action: 'cash_out',
    module: 'cash',
    description: `${currentUser?.name || 'Kasir'} tarik uang kas Rp ${Math.round(amount).toLocaleString('id-ID')}`,
    meta: { amount: Math.round(Number(amount) || 0) },
  })
  save(db)
  return { ok: true, message: `Berhasil tarik ${Math.round(amount).toLocaleString('id-ID')}. Saldo: ${res.balance.toLocaleString('id-ID')}`, balance: res.balance }
}

export function resetDatabase() {
  const actor = currentActor()
  const fresh = buildSeed()
  // keep a reset log on the new DB
  if (!fresh.activity_logs) fresh.activity_logs = []
  fresh.activity_logs.unshift({
    id: (fresh.activity_logs.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1,
    user_id: actor?.id ?? null,
    user_name: actor?.name ?? 'Sistem',
    role_slug: actor?.role_slug ?? null,
    action: 'reset',
    module: 'system',
    description: `${actor?.name || 'Sistem'} mereset data uji coba ke awal`,
    meta: null,
    created_at: nowIso(),
  })
  save(fresh)
  return fresh
}

function nextId(rows) {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
}

function nowIso() {
  // simpan sebagai ISO lokal supaya tanggal konsisten dengan zona perangkat
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function dateOnly(iso) {
  return (iso || '').slice(0, 10)
}

function todayStr() {
  return dateOnly(nowIso())
}

/** Catat aktivitas ke log (dipakai internal sebelum save) */
function currentActor() {
  try {
    const raw = localStorage.getItem('kasir_dzikra_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function pushLog(db, { user, action, module, description, meta = null }) {
  if (!db.activity_logs) db.activity_logs = []
  const actor = user || currentActor()
  db.activity_logs.push({
    id: nextId(db.activity_logs),
    user_id: actor?.id ?? null,
    user_name: actor?.name ?? 'Sistem',
    role_slug: actor?.role_slug ?? null,
    action,
    module,
    description,
    meta,
    created_at: nowIso(),
  })
  if (db.activity_logs.length > 800) {
    db.activity_logs = db.activity_logs.slice(-800)
  }
}

/** Log aktivitas dari luar (mis. logout) */
export function logActivity({ user, action, module, description, meta = null }) {
  const db = load()
  pushLog(db, { user, action, module, description, meta })
  save(db)
}

/** Hanya untuk Owner: daftar log aktivitas */
export function getActivityLogs({ module = '', search = '', dateFrom = '', dateTo = '', limit = 200 } = {}) {
  const db = load()
  let rows = [...(db.activity_logs || [])]
  if (module) rows = rows.filter((l) => l.module === module)
  if (dateFrom) rows = rows.filter((l) => dateOnly(l.created_at) >= dateFrom)
  if (dateTo) rows = rows.filter((l) => dateOnly(l.created_at) <= dateTo)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (l) =>
        (l.description || '').toLowerCase().includes(q) ||
        (l.user_name || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.module || '').toLowerCase().includes(q)
    )
  }
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return rows.slice(0, limit)
}

/* ============ TOKO / STRUK ============ */

const DEFAULT_SHOP_SETTINGS = {
  shop_name: BRAND_NAME,
  receipt_name: BRAND_NAME,
  tagline: 'Toko & penitipan hewan',
  address: 'Jl. Pet Shop No. 1, Indonesia',
  phone: '0812-3456-7890',
  receipt_footer: 'Terima kasih atas kunjungan Anda!',
  receipt_note: 'Barang yang sudah dibeli tidak dapat ditukar',
  logo: null,
  updated_at: null,
}

export function getShopSettings() {
  const db = load()
  const merged = { ...DEFAULT_SHOP_SETTINGS, ...(db.shop_settings || {}) }
  const shop_name = normalizeBrandName(merged.shop_name)
  const receipt_name = normalizeBrandName(merged.receipt_name, shop_name)
  if (merged.shop_name !== shop_name || merged.receipt_name !== receipt_name) {
    db.shop_settings = { ...merged, shop_name, receipt_name }
    save(db)
  }
  return { ...merged, shop_name, receipt_name }
}

export function saveShopSettings(data, actor = null) {
  const db = load()
  const shop_name = normalizeBrandName(data.shop_name)
  if (!String(data.shop_name || '').trim()) return { ok: false, message: 'Nama toko wajib diisi.' }
  const receipt_name = normalizeBrandName(data.receipt_name, shop_name)
  let logo = data.logo === undefined ? (db.shop_settings?.logo ?? null) : data.logo
  if (logo === '') logo = null
  // batasi ukuran logo base64 (~400 KB teks)
  if (logo && logo.length > 450000) {
    return { ok: false, message: 'Logo terlalu besar. Gunakan gambar lebih kecil.' }
  }
  db.shop_settings = {
    shop_name,
    receipt_name,
    tagline: String(data.tagline || '').trim(),
    address: String(data.address || '').trim(),
    phone: String(data.phone || '').trim(),
    receipt_footer: String(data.receipt_footer || DEFAULT_SHOP_SETTINGS.receipt_footer).trim(),
    receipt_note: String(data.receipt_note || DEFAULT_SHOP_SETTINGS.receipt_note).trim(),
    logo,
    updated_at: nowIso(),
  }
  pushLog(db, {
    user: actor,
    action: 'settings',
    module: 'shop',
    description: `Mengubah pengaturan toko / struk (${shop_name})`,
  })
  save(db)
  return { ok: true, message: 'Pengaturan toko & struk disimpan.', settings: db.shop_settings }
}

/* ============ AUTH ============ */

export function login(email, password) {
  const db = load()
  const user = db.users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase().trim() && u.is_active
  )
  if (!user || user.password !== password) {
    return { ok: false, message: 'Email atau password salah, atau akun tidak aktif.' }
  }
  const role = db.roles.find((r) => r.id === user.role_id)
  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role_name: role?.name ?? 'User',
    role_slug: role?.slug ?? '',
  }
  pushLog(db, {
    user: publicUser,
    action: 'login',
    module: 'auth',
    description: `${publicUser.name} masuk ke aplikasi`,
  })
  save(db)
  return { ok: true, user: publicUser }
}

/* ============ DASHBOARD ============ */

export function getDashboardStats() {
  const db = load()
  const today = todayStr()

  const activeProducts = db.products.filter((p) => p.is_active)
  const total_products = activeProducts.length
  const total_stock = activeProducts.reduce((s, p) => s + p.stock, 0)

  const todayTx = db.transactions.filter((t) => dateOnly(t.created_at) === today)
  const today_transactions = todayTx.length
  const today_revenue = todayTx.reduce((s, t) => s + t.total, 0)

  const lowStock = activeProducts
    .filter((p) => p.stock <= 10)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)

  const recentTransactions = [...db.transactions]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5)
    .map((t) => ({ ...t, cashier_name: db.users.find((u) => u.id === t.user_id)?.name ?? null }))

  // produk terlaris hari ini
  const todayTxIds = new Set(todayTx.map((t) => t.id))
  const soldMap = {}
  db.transaction_items
    .filter((i) => todayTxIds.has(i.transaction_id))
    .forEach((i) => {
      if (!soldMap[i.product_name]) soldMap[i.product_name] = { product_name: i.product_name, total_sold: 0, total_revenue: 0 }
      soldMap[i.product_name].total_sold += i.qty
      soldMap[i.product_name].total_revenue += i.subtotal
    })
  const topProducts = Object.values(soldMap).sort((a, b) => b.total_sold - a.total_sold).slice(0, 5)

  const hotelActive = (db.hotel_bookings || []).filter((b) => b.status === 'checked_in').length
  const hotelReserved = (db.hotel_bookings || []).filter((b) => b.status === 'reserved').length

  return {
    stats: { total_products, total_stock, today_transactions, today_revenue, hotelActive, hotelReserved },
    lowStock,
    topProducts,
    recentTransactions,
  }
}

/* ============ CATEGORIES ============ */

export function getCategories() {
  return load().categories
}

export function getCategoriesWithCounts() {
  const db = load()
  return db.categories.map((c) => ({
    ...c,
    product_count: db.products.filter((p) => p.category_id === c.id).length,
  }))
}

export function createCategory({ name, description }) {
  const db = load()
  const id = nextId(db.categories)
  const nm = name.trim()
  db.categories.push({ id, name: nm, description: description?.trim() || null })
  pushLog(db, { action: 'create', module: 'category', description: `Menambah kategori "${nm}"` })
  save(db)
  return { ok: true, message: 'Kategori berhasil ditambahkan.' }
}

export function updateCategory(id, { name, description }) {
  const db = load()
  const cat = db.categories.find((c) => c.id === Number(id))
  if (!cat) return { ok: false, message: 'Kategori tidak ditemukan.' }
  cat.name = name.trim()
  cat.description = description?.trim() || null
  pushLog(db, { action: 'update', module: 'category', description: `Mengubah kategori "${cat.name}"` })
  save(db)
  return { ok: true, message: 'Kategori berhasil diperbarui.' }
}

export function deleteCategory(id) {
  const db = load()
  const used = db.products.some((p) => p.category_id === Number(id))
  if (used) return { ok: false, message: 'Kategori tidak dapat dihapus karena masih memiliki produk.' }
  const cat = db.categories.find((c) => c.id === Number(id))
  db.categories = db.categories.filter((c) => c.id !== Number(id))
  pushLog(db, { action: 'delete', module: 'category', description: `Menghapus kategori "${cat?.name || id}"` })
  save(db)
  return { ok: true, message: 'Kategori berhasil dihapus.' }
}

/* ============ PRODUCTS ============ */

export function getProducts({ search = '', categoryId = '' } = {}) {
  const db = load()
  let rows = db.products.map((p) => ({
    ...p,
    category_name: db.categories.find((c) => c.id === p.category_id)?.name ?? '-',
  }))
  if (categoryId) rows = rows.filter((p) => p.category_id === Number(categoryId))
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
    )
  }
  return rows.sort((a, b) => (a.name > b.name ? 1 : -1))
}

// produk untuk POS: aktif & stok > 0
export function getPosProducts({ search = '', categoryId = '' } = {}) {
  return getProducts({ search, categoryId }).filter((p) => p.is_active && p.stock > 0)
}

/** Normalisasi kode barcode/SKU untuk pencocokan */
export function normalizeScanCode(code) {
  return String(code || '')
    .trim()
    .replace(/[\s\-]/g, '')
}

function barcodeVariants(code) {
  const n = normalizeScanCode(code)
  if (!n) return []
  const set = new Set([n, n.toUpperCase()])
  // angka saja (EAN/UPC)
  const digits = n.replace(/\D/g, '')
  if (digits) {
    set.add(digits)
    // buang leading zero umum
    set.add(digits.replace(/^0+/, '') || '0')
    // pad EAN-13
    if (digits.length < 13 && digits.length >= 8) {
      set.add(digits.padStart(13, '0'))
    }
  }
  return [...set]
}

/** Cari produk aktif lewat barcode atau SKU (untuk scan kasir) */
export function findProductByScan(code) {
  const q = normalizeScanCode(code)
  if (!q) return { ok: false, message: 'Kode kosong.' }
  const db = load()
  const variants = barcodeVariants(q)
  const upper = q.toUpperCase()

  const prod = db.products.find((p) => {
    if (!p.is_active) return false
    const sku = String(p.sku || '').trim().toUpperCase()
    if (sku && (sku === upper || variants.includes(sku))) return true
    const bc = normalizeScanCode(p.barcode || '')
    if (!bc) return false
    const pVars = barcodeVariants(bc)
    return variants.some((v) => pVars.includes(v) || bc === v)
  })

  if (!prod) {
    return {
      ok: false,
      message: `Barang tidak ditemukan: ${q}. Pastikan barcode di menu Produk sama persis.`,
      code: q,
    }
  }
  if (Number(prod.stock) <= 0) {
    return { ok: false, message: `"${prod.name}" stok habis. Tambah stok dulu.`, code: q }
  }
  const cat = db.categories.find((c) => c.id === prod.category_id)
  return {
    ok: true,
    product: {
      ...prod,
      category_name: cat?.name ?? '',
    },
    code: q,
  }
}

export function getProduct(id) {
  return load().products.find((p) => p.id === Number(id)) || null
}

/** Prefiks SKU dari nama kategori (MK, AK, PR, MN, KN, ...) */
export function skuPrefixFromCategory(category) {
  const name = String(category?.name || '').toLowerCase()
  if (name.includes('makanan')) return 'MK'
  if (name.includes('aksesoris')) return 'AK'
  if (name.includes('perawatan')) return 'PR'
  if (name.includes('mainan')) return 'MN'
  if (name.includes('kandang') || name.includes('aquarium')) return 'KN'
  const letters = name.replace(/[^a-z]/g, '').toUpperCase()
  return (letters.slice(0, 2) || 'PR').padEnd(2, 'X')
}

/** SKU berikutnya untuk kategori, contoh: MK-006 */
export function generateNextSku(categoryId) {
  const db = load()
  const cat = db.categories.find((c) => c.id === Number(categoryId))
  if (!cat) return ''
  const prefix = skuPrefixFromCategory(cat)
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  let max = 0
  for (const p of db.products) {
    const m = String(p.sku || '').match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

export function createProduct(data) {
  const db = load()
  const categoryId = Number(data.category_id)
  if (!db.categories.some((c) => c.id === categoryId)) {
    return { ok: false, message: 'Kategori tidak valid.' }
  }
  const sku = generateNextSku(categoryId)
  if (!sku) return { ok: false, message: 'Gagal membuat SKU otomatis.' }
  if (db.products.some((p) => p.sku === sku)) {
    return { ok: false, message: 'SKU sudah digunakan.' }
  }
  const id = nextId(db.products)
  const barcode = normalizeScanCode(data.barcode || '') || `8991001${String(id).padStart(6, '0')}`
  if (db.products.some((p) => p.barcode && normalizeScanCode(p.barcode) === barcode)) {
    return { ok: false, message: 'Barcode sudah digunakan.' }
  }
  let photo = data.photo === undefined ? null : data.photo
  if (photo === '') photo = null
  if (photo && photo.length > 350000) {
    return { ok: false, message: 'Foto produk terlalu besar. Gunakan gambar lebih kecil.' }
  }
  db.products.push({
    id,
    category_id: categoryId,
    sku,
    barcode,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    price: Number(data.price) || 0,
    stock: Number(data.stock) || 0,
    photo,
    is_active: data.is_active ? 1 : 0,
  })
  pushLog(db, { action: 'create', module: 'product', description: `Menambah produk "${data.name.trim()}" (${sku})` })
  save(db)
  return { ok: true, message: `Produk berhasil ditambahkan. SKU: ${sku}` }
}

export function updateProduct(id, data) {
  const db = load()
  const prod = db.products.find((p) => p.id === Number(id))
  if (!prod) return { ok: false, message: 'Produk tidak ditemukan.' }
  // SKU tidak diubah saat edit (dibuat otomatis saat tambah produk)
  const sku = prod.sku
  const barcode = normalizeScanCode(data.barcode || '') || prod.barcode || `8991001${String(prod.id).padStart(6, '0')}`
  if (db.products.some((p) => p.barcode && normalizeScanCode(p.barcode) === barcode && p.id !== Number(id))) {
    return { ok: false, message: 'Barcode sudah digunakan produk lain.' }
  }
  let photo = data.photo === undefined ? (prod.photo ?? null) : data.photo
  if (photo === '') photo = null
  if (photo && photo.length > 350000) {
    return { ok: false, message: 'Foto produk terlalu besar. Gunakan gambar lebih kecil.' }
  }
  prod.category_id = Number(data.category_id)
  prod.barcode = barcode
  prod.name = data.name.trim()
  prod.description = data.description?.trim() || null
  prod.price = Number(data.price) || 0
  prod.stock = Number(data.stock) || 0
  prod.photo = photo
  prod.is_active = data.is_active ? 1 : 0
  pushLog(db, { action: 'update', module: 'product', description: `Mengubah produk "${prod.name}" (${sku})` })
  save(db)
  return { ok: true, message: 'Produk berhasil diperbarui.' }
}

export function addStock(id, amount) {
  const db = load()
  const prod = db.products.find((p) => p.id === Number(id))
  if (!prod) return { ok: false, message: 'Produk tidak ditemukan.' }
  const amt = Number(amount) || 0
  prod.stock += amt
  pushLog(db, { action: 'stock_add', module: 'product', description: `Menambah stok "${prod.name}" sebanyak ${amt}` })
  save(db)
  return { ok: true, message: `Stok ${prod.name} bertambah ${amount}.` }
}

export function deleteProduct(id) {
  const db = load()
  const used = db.transaction_items.some((i) => i.product_id === Number(id))
  const prod = db.products.find((p) => p.id === Number(id))
  if (!prod) return { ok: false, message: 'Produk tidak ditemukan.' }
  if (used) {
    prod.is_active = 0
    pushLog(db, { action: 'deactivate', module: 'product', description: `Menonaktifkan produk "${prod.name}"` })
    save(db)
    return { ok: true, message: 'Produk dinonaktifkan (sudah pernah terjual).' }
  }
  const name = prod.name
  db.products = db.products.filter((p) => p.id !== Number(id))
  pushLog(db, { action: 'delete', module: 'product', description: `Menghapus produk "${name}"` })
  save(db)
  return { ok: true, message: 'Produk berhasil dihapus.' }
}

/* ============ POS CHECKOUT ============ */

function generateInvoice(db) {
  const today = todayStr().replace(/-/g, '')
  const prefix = `INV-${today}-`
  const todayCount = db.transactions.filter((t) => t.invoice_number.startsWith(prefix)).length
  const seq = String(todayCount + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

/* ============ HELD / PARKED ORDERS (belum bayar) ============ */

export function getHeldOrders() {
  return [...(load().held_orders || [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

/** Tahan keranjang pelanggan A agar bisa layani pelanggan B */
export function holdOrder({ customer_name, items, discount = 0, discount_type = 'rp', discount_value = null }, currentUser = null) {
  const db = load()
  if (!Array.isArray(db.held_orders)) db.held_orders = []
  const name = String(customer_name || '').trim()
  if (!name) return { ok: false, message: 'Isi nama pelanggan dulu sebelum menahan pesanan.' }
  if (!items?.length) return { ok: false, message: 'Keranjang kosong.' }

  const id = nextId(db.held_orders)
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const type = discount_type === 'percent' ? 'percent' : 'rp'
  const value = discount_value != null ? Number(discount_value) || 0 : Number(discount) || 0
  let disc = Number(discount) || 0
  if (type === 'percent') {
    disc = Math.round((subtotal * Math.min(100, Math.max(0, value))) / 100)
  } else {
    disc = Math.min(subtotal, Math.max(0, Math.round(value)))
  }
  const order = {
    id,
    customer_name: name,
    items: items.map((i) => ({ ...i })),
    discount: disc,
    discount_type: type,
    discount_value: value,
    subtotal,
    total: Math.max(0, subtotal - disc),
    item_count: items.reduce((s, i) => s + i.qty, 0),
    user_id: currentUser?.id ?? null,
    created_at: nowIso(),
  }
  db.held_orders.push(order)
  pushLog(db, {
    user: currentUser,
    action: 'hold',
    module: 'pos',
    description: `Menahan pesanan ${name} (${order.item_count} item)`,
  })
  save(db)
  return { ok: true, message: `Pesanan "${name}" ditahan. Silakan layani pelanggan lain.`, order }
}

/** Lanjutkan pesanan ditahan ke keranjang aktif */
export function resumeHeldOrder(id) {
  const db = load()
  const order = (db.held_orders || []).find((o) => o.id === Number(id))
  if (!order) return { ok: false, message: 'Pesanan ditahan tidak ditemukan.' }
  db.held_orders = db.held_orders.filter((o) => o.id !== Number(id))
  save(db)
  return {
    ok: true,
    message: `Pesanan "${order.customer_name}" dilanjutkan.`,
    order,
  }
}

/** Pindah pemesanan dari pelanggan A ke pelanggan B (belum bayar) */
export function transferHeldOrder(id, newCustomerName, currentUser = null) {
  const db = load()
  const order = (db.held_orders || []).find((o) => o.id === Number(id))
  if (!order) return { ok: false, message: 'Pesanan ditahan tidak ditemukan.' }
  const next = String(newCustomerName || '').trim()
  if (!next) return { ok: false, message: 'Nama pelanggan baru wajib diisi.' }
  if (next.toLowerCase() === String(order.customer_name).toLowerCase()) {
    return { ok: false, message: 'Nama pelanggan baru sama dengan sebelumnya.' }
  }
  const prev = order.customer_name
  order.customer_name = next
  pushLog(db, {
    user: currentUser,
    action: 'transfer',
    module: 'pos',
    description: `Memindah pesanan dari "${prev}" ke "${next}"`,
  })
  save(db)
  return { ok: true, message: `Pesanan dipindah: ${prev} → ${next}`, order }
}

export function deleteHeldOrder(id, currentUser = null) {
  const db = load()
  const order = (db.held_orders || []).find((o) => o.id === Number(id))
  if (!order) return { ok: false, message: 'Pesanan ditahan tidak ditemukan.' }
  db.held_orders = db.held_orders.filter((o) => o.id !== Number(id))
  pushLog(db, {
    user: currentUser,
    action: 'delete',
    module: 'pos',
    description: `Membuang pesanan ditahan "${order.customer_name}"`,
  })
  save(db)
  return { ok: true, message: `Pesanan "${order.customer_name}" dibuang.` }
}

export function checkout(payload, currentUser) {
  const db = load()
  const { items, discount = 0, payment_method = 'cash', cash_received = null, customer_name = '', notes = '' } = payload

  if (!items || items.length === 0) {
    return { success: false, message: 'Keranjang kosong.' }
  }

  let subtotal = 0
  const lineItems = []
  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.product_id)
    if (!prod) return { success: false, message: 'Produk tidak ditemukan.' }
    if (prod.stock < it.qty) return { success: false, message: `Stok ${prod.name} tidak mencukupi.` }
    const line = prod.price * it.qty
    subtotal += line
    lineItems.push({ prod, qty: it.qty, price: prod.price, subtotal: line })
  }

  const total = Math.max(0, subtotal - (Number(discount) || 0))

  let change_amount = null
  if (payment_method === 'cash') {
    const cash = Number(cash_received) || 0
    if (cash < total) return { success: false, message: 'Uang yang diterima kurang dari total.' }
    change_amount = cash - total
  }

  const txId = nextId(db.transactions)
  const invoice_number = generateInvoice(db)
  const created_at = nowIso()

  db.transactions.push({
    id: txId,
    invoice_number,
    user_id: currentUser?.id ?? null,
    subtotal,
    discount: Number(discount) || 0,
    total,
    payment_method,
    cash_received: payment_method === 'cash' ? Number(cash_received) || 0 : null,
    change_amount,
    customer_name: customer_name?.trim() || null,
    notes: notes?.trim() || null,
    created_at,
  })

  let itemId = nextId(db.transaction_items)
  for (const li of lineItems) {
    db.transaction_items.push({
      id: itemId++,
      transaction_id: txId,
      product_id: li.prod.id,
      product_name: li.prod.name,
      qty: li.qty,
      price: li.price,
      subtotal: li.subtotal,
      created_at,
    })
    li.prod.stock -= li.qty
  }

  pushLog(db, {
    user: currentUser,
    action: 'sale',
    module: 'pos',
    description: `${currentUser?.name || 'Kasir'} mencatat penjualan ${invoice_number} sebesar Rp ${Math.round(total).toLocaleString('id-ID')}`,
    meta: { invoice_number, total, payment_method },
  })

  if (payment_method === 'cash' && total > 0) {
    applyCashMovement(db, {
      type: 'sale_cash',
      amount: total,
      note: `Penjualan tunai ${invoice_number}`,
      reference: invoice_number,
      user: currentUser,
      created_at,
    })
  }

  save(db)
  return { success: true, transaction_id: txId, invoice_number, total, change_amount }
}

/* ============ TRANSACTIONS ============ */

export function getTransactions({ dateFrom, dateTo, search = '' } = {}, currentUser) {
  const db = load()
  let rows = db.transactions.map((t) => ({
    ...t,
    cashier_name: db.users.find((u) => u.id === t.user_id)?.name ?? null,
  }))

  // kasir hanya melihat transaksinya sendiri
  if (currentUser?.role_slug === 'kasir') {
    rows = rows.filter((t) => t.user_id === currentUser.id)
  }
  if (dateFrom) rows = rows.filter((t) => dateOnly(t.created_at) >= dateFrom)
  if (dateTo) rows = rows.filter((t) => dateOnly(t.created_at) <= dateTo)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (t) => t.invoice_number.toLowerCase().includes(q) || (t.customer_name || '').toLowerCase().includes(q)
    )
  }

  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const summary = {
    total_count: rows.length,
    total_revenue: rows.reduce((s, t) => s + t.total, 0),
  }
  return { transactions: rows, summary }
}

export function getTransaction(id, currentUser) {
  const db = load()
  const t = db.transactions.find((x) => x.id === Number(id))
  if (!t) return { ok: false, message: 'Transaksi tidak ditemukan.' }
  if (currentUser?.role_slug === 'kasir' && t.user_id !== currentUser.id) {
    return { ok: false, message: 'Anda tidak memiliki akses ke transaksi ini.' }
  }
  const transaction = { ...t, cashier_name: db.users.find((u) => u.id === t.user_id)?.name ?? null }
  const items = db.transaction_items.filter((i) => i.transaction_id === t.id)
  return { ok: true, transaction, items }
}

/* ============ REPORTS ============ */

export function getReport({ dateFrom, dateTo } = {}) {
  const db = load()
  let rows = db.transactions
  if (dateFrom) rows = rows.filter((t) => dateOnly(t.created_at) >= dateFrom)
  if (dateTo) rows = rows.filter((t) => dateOnly(t.created_at) <= dateTo)

  const total_transactions = rows.length
  const total_revenue = rows.reduce((s, t) => s + t.total, 0)
  const total_discount = rows.reduce((s, t) => s + t.discount, 0)
  const avg_transaction = total_transactions ? total_revenue / total_transactions : 0

  // per metode bayar
  const payMap = {}
  rows.forEach((t) => {
    if (!payMap[t.payment_method]) payMap[t.payment_method] = { payment_method: t.payment_method, total_count: 0, total_amount: 0 }
    payMap[t.payment_method].total_count += 1
    payMap[t.payment_method].total_amount += t.total
  })
  const byPayment = Object.values(payMap).sort((a, b) => b.total_amount - a.total_amount)

  // per kasir
  const cashierMap = {}
  rows.forEach((t) => {
    const name = db.users.find((u) => u.id === t.user_id)?.name ?? 'Unknown'
    if (!cashierMap[name]) cashierMap[name] = { cashier_name: name, total_count: 0, total_revenue: 0 }
    cashierMap[name].total_count += 1
    cashierMap[name].total_revenue += t.total
  })
  const byCashier = Object.values(cashierMap).sort((a, b) => b.total_revenue - a.total_revenue)

  // produk terlaris
  const txIds = new Set(rows.map((t) => t.id))
  const prodMap = {}
  db.transaction_items
    .filter((i) => txIds.has(i.transaction_id))
    .forEach((i) => {
      if (!prodMap[i.product_name]) prodMap[i.product_name] = { product_name: i.product_name, total_qty: 0, total_revenue: 0 }
      prodMap[i.product_name].total_qty += i.qty
      prodMap[i.product_name].total_revenue += i.subtotal
    })
  const topProducts = Object.values(prodMap).sort((a, b) => b.total_qty - a.total_qty).slice(0, 10)

  // penjualan harian
  const dayMap = {}
  rows.forEach((t) => {
    const d = dateOnly(t.created_at)
    if (!dayMap[d]) dayMap[d] = { sale_date: d, total_count: 0, total_revenue: 0 }
    dayMap[d].total_count += 1
    dayMap[d].total_revenue += t.total
  })
  const dailySales = Object.values(dayMap).sort((a, b) => (a.sale_date < b.sale_date ? 1 : -1))

  return {
    summary: { total_transactions, total_revenue, total_discount, avg_transaction },
    byPayment,
    byCashier,
    topProducts,
    dailySales,
  }
}

/* ============ REKAPAN PEMBUKUAN (BUKU KAS) ============ */

export function getBookkeeping({ dateFrom, dateTo } = {}) {
  const db = load()

  let rows = db.transactions.map((t) => ({
    ...t,
    cashier_name: db.users.find((u) => u.id === t.user_id)?.name ?? '-',
  }))
  if (dateFrom) rows = rows.filter((t) => dateOnly(t.created_at) >= dateFrom)
  if (dateTo) rows = rows.filter((t) => dateOnly(t.created_at) <= dateTo)

  // urut menaik (kronologis) seperti buku kas
  rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  // jumlah item (qty) per transaksi
  const qtyByTx = {}
  db.transaction_items.forEach((i) => {
    qtyByTx[i.transaction_id] = (qtyByTx[i.transaction_id] || 0) + i.qty
  })

  let saldo = 0
  const entries = rows.map((t, i) => {
    saldo += t.total
    return { ...t, no: i + 1, item_qty: qtyByTx[t.id] || 0, saldo }
  })

  // kelompokkan per hari beserta subtotal
  const groupMap = {}
  entries.forEach((e) => {
    const d = dateOnly(e.created_at)
    if (!groupMap[d]) groupMap[d] = { date: d, entries: [], count: 0, subtotal: 0, discount: 0, revenue: 0 }
    const g = groupMap[d]
    g.entries.push(e)
    g.count += 1
    g.subtotal += e.subtotal
    g.discount += e.discount
    g.revenue += e.total
  })
  const days = Object.values(groupMap).sort((a, b) => (a.date < b.date ? -1 : 1))

  const totals = {
    count: entries.length,
    subtotal: entries.reduce((s, e) => s + e.subtotal, 0),
    discount: entries.reduce((s, e) => s + e.discount, 0),
    revenue: entries.reduce((s, e) => s + e.total, 0),
  }

  return { entries, days, totals }
}

/* ============ USERS ============ */

export function getRoles() {
  return load().roles
}

export function getUsers() {
  const db = load()
  return db.users.map((u) => {
    const role = db.roles.find((r) => r.id === u.role_id)
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role_id: u.role_id,
      is_active: u.is_active,
      device_barcode: u.device_barcode || `DEV-${String(u.id).padStart(6, '0')}`,
      role_name: role?.name ?? '-',
      role_slug: role?.slug ?? '',
    }
  })
}

export function createUser(data, actor = null) {
  const db = load()
  const roleId = Number(data.role_id)
  const role = db.roles.find((r) => r.id === roleId)
  if (!role) return { ok: false, message: 'Role tidak valid.' }
  if (actor?.role_slug === 'admin' && role.slug === 'owner') {
    return { ok: false, message: 'Admin tidak dapat menambah akun Owner.' }
  }
  if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase().trim())) {
    return { ok: false, message: 'Email sudah digunakan.' }
  }
  if (!data.password) return { ok: false, message: 'Password wajib diisi.' }
  const id = nextId(db.users)
  const device_barcode =
    normalizeScanCode(data.device_barcode || '') || `DEV-${String(id).padStart(6, '0')}`
  if (db.users.some((u) => normalizeScanCode(u.device_barcode || '') === device_barcode)) {
    return { ok: false, message: 'Barcode device sudah dipakai pengguna lain.' }
  }
  db.users.push({
    id,
    role_id: roleId,
    name: data.name.trim(),
    email: data.email.trim(),
    password: data.password,
    is_active: 1,
    device_barcode,
  })
  pushLog(db, { user: actor, action: 'create', module: 'user', description: `Menambah pengguna "${data.name.trim()}"` })
  save(db)
  return { ok: true, message: 'Pengguna berhasil ditambahkan.' }
}

export function updateUser(id, data, actor = null) {
  const db = load()
  const user = db.users.find((u) => u.id === Number(id))
  if (!user) return { ok: false, message: 'Pengguna tidak ditemukan.' }
  const currentRole = db.roles.find((r) => r.id === user.role_id)
  const nextRoleId = Number(data.role_id)
  const nextRole = db.roles.find((r) => r.id === nextRoleId)
  if (!nextRole) return { ok: false, message: 'Role tidak valid.' }
  if (actor?.role_slug === 'admin' && (currentRole?.slug === 'owner' || nextRole.slug === 'owner')) {
    return { ok: false, message: 'Admin tidak dapat mengubah akun / role Owner.' }
  }
  if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase().trim() && u.id !== Number(id))) {
    return { ok: false, message: 'Email sudah digunakan pengguna lain.' }
  }
  const device_barcode =
    normalizeScanCode(data.device_barcode || '') ||
    user.device_barcode ||
    `DEV-${String(user.id).padStart(6, '0')}`
  if (
    db.users.some(
      (u) => normalizeScanCode(u.device_barcode || '') === device_barcode && u.id !== Number(id)
    )
  ) {
    return { ok: false, message: 'Barcode device sudah dipakai pengguna lain.' }
  }
  user.name = data.name.trim()
  user.email = data.email.trim()
  user.role_id = nextRoleId
  user.is_active = data.is_active ? 1 : 0
  user.device_barcode = device_barcode
  if (data.password) user.password = data.password
  pushLog(db, { user: actor, action: 'update', module: 'user', description: `Mengubah pengguna "${user.name}"` })
  save(db)
  return { ok: true, message: 'Pengguna berhasil diperbarui.' }
}

export function deleteUser(id, currentUser) {
  const db = load()
  if (Number(id) === currentUser?.id) {
    return { ok: false, message: 'Anda tidak dapat menghapus akun sendiri.' }
  }
  const target = db.users.find((u) => u.id === Number(id))
  if (!target) return { ok: false, message: 'Pengguna tidak ditemukan.' }
  const targetRole = db.roles.find((r) => r.id === target.role_id)
  if (currentUser?.role_slug === 'admin' && targetRole?.slug === 'owner') {
    return { ok: false, message: 'Admin tidak dapat menghapus akun Owner.' }
  }
  db.users = db.users.filter((u) => u.id !== Number(id))
  pushLog(db, { user: currentUser, action: 'delete', module: 'user', description: `Menghapus pengguna "${target?.name || id}"` })
  save(db)
  return { ok: true, message: 'Pengguna berhasil dihapus.' }
}

/* ============ ABSENSI (1 barcode toko + pilih pegawai + selfie + lokasi) ============ */

/** Barcode absensi tunggal untuk seluruh toko */
export const ATTENDANCE_BARCODE = 'ABSEN-DZIKRA'

export function getAttendanceBarcode() {
  return ATTENDANCE_BARCODE
}

/** URL absolut ke halaman form absensi (untuk QR yang bisa dibuka kamera HP) */
export function getAttendanceFormUrl() {
  if (typeof window === 'undefined') return '#/attendance/form?unlock=1'
  const { origin, pathname } = window.location
  const path = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : ''
  return `${origin}${path || ''}/#/attendance/form?unlock=1`.replace(/([^:]\/)\/+/g, '$1')
}

export function isAttendanceBarcode(code) {
  const raw = String(code || '').trim()
  if (!raw) return false
  const lower = raw.toLowerCase()
  // QR berisi URL ke halaman absensi
  if (
    lower.includes('attendance/form') ||
    lower.includes('unlock=1') ||
    (lower.includes('attendance') && lower.includes('unlock'))
  ) {
    return true
  }
  const variants = barcodeVariants(ATTENDANCE_BARCODE).map((v) => v.toUpperCase())
  const q = normalizeScanCode(raw).toUpperCase()
  return variants.includes(q) || q === 'ABSENDZIKRA' || q.replace(/[^A-Z0-9]/g, '') === 'ABSENDZIKRA'
}

/** Ambil path in-app dari hasil scan (teks kode atau URL) */
export function attendancePathFromScan(code) {
  const raw = String(code || '').trim()
  if (!isAttendanceBarcode(raw)) return null
  if (/^https?:\/\//i.test(raw) || raw.includes('#/')) {
    const hashIdx = raw.indexOf('#')
    if (hashIdx >= 0) {
      const hash = raw.slice(hashIdx + 1) // /attendance/form?unlock=1
      return hash.startsWith('/') ? hash : `/${hash}`
    }
    try {
      const u = new URL(raw)
      if (u.hash) {
        const h = u.hash.replace(/^#/, '')
        return h.startsWith('/') ? h : `/${h}`
      }
    } catch { /* ignore */ }
  }
  return '/attendance/form?unlock=1'
}

const DEFAULT_ATT_SETTINGS = {
  label: 'PetShop Dzikra',
  latitude: null,
  longitude: null,
  radius_m: 100,
  enforce: false,
  updated_at: null,
}

/** Haversine distance in meters */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function getAttendanceSettings() {
  const db = load()
  return { ...DEFAULT_ATT_SETTINGS, ...(db.attendance_settings || {}) }
}

export function saveAttendanceSettings(data, actor = null) {
  const db = load()
  const lat = data.latitude === '' || data.latitude == null ? null : Number(data.latitude)
  const lng = data.longitude === '' || data.longitude == null ? null : Number(data.longitude)
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    return { ok: false, message: 'Latitude tidak valid (-90 s/d 90).' }
  }
  if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
    return { ok: false, message: 'Longitude tidak valid (-180 s/d 180).' }
  }
  if ((lat == null) !== (lng == null)) {
    return { ok: false, message: 'Latitude dan longitude harus diisi berpasangan.' }
  }
  const radius = Math.max(10, Math.min(5000, Number(data.radius_m) || 100))
  db.attendance_settings = {
    label: String(data.label || 'PetShop Dzikra').trim() || 'PetShop Dzikra',
    latitude: lat,
    longitude: lng,
    radius_m: radius,
    enforce: Boolean(data.enforce),
    updated_at: nowIso(),
  }
  pushLog(db, {
    user: actor,
    action: 'settings',
    module: 'attendance',
    description: `Mengubah lokasi absensi${lat != null ? ` (${lat.toFixed(5)}, ${lng.toFixed(5)}, radius ${radius}m)` : ' (belum diset)'}`,
  })
  save(db)
  return { ok: true, message: 'Pengaturan lokasi absensi disimpan.', settings: db.attendance_settings }
}

/** Cek posisi user terhadap lokasi toko yang diset */
export function checkAttendanceLocation(location) {
  const settings = getAttendanceSettings()
  if (settings.latitude == null || settings.longitude == null) {
    return {
      ok: true,
      configured: false,
      message: 'Lokasi toko belum diatur.',
      settings,
      distance_m: null,
      within: true,
    }
  }
  if (!location || location.latitude == null || location.longitude == null) {
    return {
      ok: false,
      configured: true,
      message: 'Lokasi GPS belum tersedia.',
      settings,
      distance_m: null,
      within: false,
    }
  }
  const distance_m = distanceMeters(
    location.latitude,
    location.longitude,
    settings.latitude,
    settings.longitude
  )
  const within = distance_m <= Number(settings.radius_m || 100)
  return {
    ok: true,
    configured: true,
    settings,
    distance_m,
    within,
    message: within
      ? `Dalam radius toko (±${Math.round(distance_m)} m)`
      : `Di luar radius toko (±${Math.round(distance_m)} m, batas ${settings.radius_m} m)`,
  }
}

function lastAttendanceToday(db, userId) {
  const today = todayStr()
  const rows = (db.attendance_logs || [])
    .filter((l) => l.user_id === Number(userId) && dateOnly(l.created_at) === today)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return rows[0] || null
}

function trimAttendanceStorage(db) {
  const logs = db.attendance_logs || []
  // urut lama → baru; hapus foto pada record lama agar localStorage tidak penuh
  const sorted = [...logs].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const keepPhoto = 30
  const newest = sorted.slice(-keepPhoto).map((l) => l.id)
  const keepSet = new Set(newest)
  logs.forEach((l) => {
    if (l.selfie && !keepSet.has(l.id)) l.selfie = null
  })
  if (logs.length > 400) {
    db.attendance_logs = [...logs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 400)
  }
}

/**
 * Absen masuk/pulang:
 * - barcode toko (satu untuk semua)
 * - pilih pegawai (userId)
 * - selfie wajib
 * - koordinat lokasi wajib
 */
export function clockAttendance({
  userId,
  barcode,
  selfie = null,
  location = null,
  actor = null,
  source = 'form',
} = {}) {
  if (!isAttendanceBarcode(barcode || ATTENDANCE_BARCODE)) {
    return { ok: false, message: `Barcode salah. Gunakan kode toko: ${ATTENDANCE_BARCODE}` }
  }
  if (!userId) return { ok: false, message: 'Pilih nama pegawai dulu.' }
  if (!selfie) return { ok: false, message: 'Selfie wajib diambil sebelum absen.' }
  if (!location || location.latitude == null || location.longitude == null) {
    return { ok: false, message: 'Lokasi GPS wajib diaktifkan.' }
  }

  const db = load()
  const geo = checkAttendanceLocation(location)
  if (geo.configured && geo.settings.enforce && !geo.within) {
    return {
      ok: false,
      message: `Absen ditolak: Anda di luar area ${geo.settings.label || 'toko'} (${Math.round(geo.distance_m)} m, batas ${geo.settings.radius_m} m).`,
      distance_m: geo.distance_m,
    }
  }

  const employee = db.users.find((u) => u.id === Number(userId))
  if (!employee || !employee.is_active) {
    return { ok: false, message: 'Pegawai tidak ditemukan / tidak aktif.' }
  }

  const last = lastAttendanceToday(db, employee.id)
  const type = !last || last.type === 'out' ? 'in' : 'out'
  const role = db.roles.find((r) => r.id === employee.role_id)

  if (!db.attendance_logs) db.attendance_logs = []
  const row = {
    id: nextId(db.attendance_logs),
    user_id: employee.id,
    user_name: employee.name,
    role_slug: role?.slug ?? null,
    barcode: ATTENDANCE_BARCODE,
    type,
    selfie,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    accuracy: location.accuracy != null ? Number(location.accuracy) : null,
    distance_m: geo.distance_m != null ? Math.round(geo.distance_m) : null,
    within_radius: geo.configured ? geo.within : null,
    scanned_by_user_id: actor?.id ?? null,
    note: null,
    meta: { source },
    created_at: nowIso(),
  }
  db.attendance_logs.push(row)
  trimAttendanceStorage(db)

  const label = type === 'in' ? 'masuk' : 'pulang'
  const distNote = geo.distance_m != null ? `, jarak ${Math.round(geo.distance_m)}m` : ''
  pushLog(db, {
    user: actor || {
      id: employee.id,
      name: employee.name,
      role_slug: role?.slug,
    },
    action: type === 'in' ? 'clock_in' : 'clock_out',
    module: 'attendance',
    description: `${employee.name} absen ${label} (GPS ${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}${distNote})`,
    meta: { attendance_id: row.id, type },
  })
  save(db)

  return {
    ok: true,
    type,
    message: type === 'in'
      ? `${employee.name} berhasil absen MASUK`
      : `${employee.name} berhasil absen PULANG`,
    record: row,
    distance_m: geo.distance_m,
    user: {
      id: employee.id,
      name: employee.name,
      role_slug: role?.slug,
      role_name: role?.name,
    },
  }
}

export function peekNextAttendanceType(userId) {
  if (!userId) return 'in'
  const db = load()
  const last = lastAttendanceToday(db, userId)
  return !last || last.type === 'out' ? 'in' : 'out'
}

export function getAttendanceLogs({
  dateFrom = '',
  dateTo = '',
  userId = '',
  search = '',
  limit = 200,
} = {}) {
  const db = load()
  let rows = [...(db.attendance_logs || [])]
  if (dateFrom) rows = rows.filter((l) => dateOnly(l.created_at) >= dateFrom)
  if (dateTo) rows = rows.filter((l) => dateOnly(l.created_at) <= dateTo)
  if (userId) rows = rows.filter((l) => l.user_id === Number(userId))
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (l) =>
        (l.user_name || '').toLowerCase().includes(q) ||
        (l.barcode || l.device_barcode || '').toLowerCase().includes(q) ||
        (l.type || '').toLowerCase().includes(q)
    )
  }
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return rows.slice(0, limit)
}

export function getAttendanceTodaySummary() {
  const db = load()
  const today = todayStr()
  const todayLogs = (db.attendance_logs || []).filter((l) => dateOnly(l.created_at) === today)
  const byUser = {}
  todayLogs
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .forEach((l) => {
      byUser[l.user_id] = l
    })
  const statuses = Object.values(byUser)
  return {
    total_scans: todayLogs.length,
    present: statuses.filter((s) => s.type === 'in').length,
    left: statuses.filter((s) => s.type === 'out').length,
    logs: todayLogs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
  }
}

/* ============ PET HOTEL / PENITIPAN ============ */

function enrichBooking(b, db) {
  const room = db.hotel_rooms.find((r) => r.id === b.room_id)
  const cashier = db.users.find((u) => u.id === b.user_id)
  return {
    ...b,
    room_code: room?.code ?? '-',
    room_name: room?.name ?? '-',
    cashier_name: cashier?.name ?? '-',
  }
}

function calcDays(checkIn, checkOut) {
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  return Math.max(1, Math.round((b - a) / 86400000))
}

function bookingOverlaps(existing, roomId, checkIn, checkOut, excludeId = null) {
  if (!['reserved', 'checked_in'].includes(existing.status)) return false
  if (existing.room_id !== Number(roomId)) return false
  if (excludeId && existing.id === Number(excludeId)) return false
  // overlap if ranges intersect (check_out is exclusive-ish: same-day checkout frees room)
  return existing.check_in_date < checkOut && existing.check_out_date > checkIn
}

function generateBookingNumber(db, checkInDate) {
  const dayKey = checkInDate.replace(/-/g, '')
  const prefix = `PH-${dayKey}-`
  const count = db.hotel_bookings.filter((b) => b.booking_number.startsWith(prefix)).length
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export function getHotelStats() {
  const db = load()
  const bookings = db.hotel_bookings || []
  const rooms = db.hotel_rooms || []
  const checkedIn = bookings.filter((b) => b.status === 'checked_in')
  const reserved = bookings.filter((b) => b.status === 'reserved')
  const occupiedRoomIds = new Set(checkedIn.map((b) => b.room_id))
  const activeRooms = rooms.filter((r) => r.is_active)
  const available = activeRooms.filter((r) => !occupiedRoomIds.has(r.id)).length
  const today = todayStr()
  const checkoutToday = checkedIn.filter((b) => b.check_out_date === today).length
  const revenue = bookings
    .filter((b) => b.status === 'checked_out' || b.payment_status === 'paid')
    .reduce((s, b) => s + (b.total || 0), 0)
  return {
    total_rooms: activeRooms.length,
    available,
    checked_in: checkedIn.length,
    reserved: reserved.length,
    checkout_today: checkoutToday,
    revenue,
  }
}

export function getHotelRooms({ activeOnly = false } = {}) {
  const db = load()
  let rooms = [...(db.hotel_rooms || [])]
  if (activeOnly) rooms = rooms.filter((r) => r.is_active)
  const occupied = new Set(
    (db.hotel_bookings || [])
      .filter((b) => b.status === 'checked_in')
      .map((b) => b.room_id)
  )
  return rooms
    .map((r) => ({ ...r, is_occupied: occupied.has(r.id) }))
    .sort((a, b) => (a.code > b.code ? 1 : -1))
}

export function getAvailableRooms({ petType = '', checkIn = '', checkOut = '', excludeBookingId = null } = {}) {
  const db = load()
  return (db.hotel_rooms || [])
    .filter((r) => r.is_active)
    .filter((r) => !petType || r.pet_type === 'semua' || r.pet_type === petType)
    .filter((r) => {
      if (!checkIn || !checkOut) return true
      return !(db.hotel_bookings || []).some((b) => bookingOverlaps(b, r.id, checkIn, checkOut, excludeBookingId))
    })
}

export function createHotelRoom(data) {
  const db = load()
  const code = data.code.trim().toUpperCase()
  if (db.hotel_rooms.some((r) => r.code === code)) {
    return { ok: false, message: 'Kode kamar sudah digunakan.' }
  }
  const id = nextId(db.hotel_rooms)
  db.hotel_rooms.push({
    id,
    code,
    name: data.name.trim(),
    pet_type: data.pet_type || 'semua',
    capacity: Number(data.capacity) || 1,
    price_per_day: Number(data.price_per_day) || 0,
    is_active: data.is_active ? 1 : 0,
    description: data.description?.trim() || null,
  })
  save(db)
  return { ok: true, message: 'Kamar berhasil ditambahkan.' }
}

export function updateHotelRoom(id, data) {
  const db = load()
  const room = db.hotel_rooms.find((r) => r.id === Number(id))
  if (!room) return { ok: false, message: 'Kamar tidak ditemukan.' }
  const code = data.code.trim().toUpperCase()
  if (db.hotel_rooms.some((r) => r.code === code && r.id !== Number(id))) {
    return { ok: false, message: 'Kode kamar sudah digunakan.' }
  }
  room.code = code
  room.name = data.name.trim()
  room.pet_type = data.pet_type || 'semua'
  room.capacity = Number(data.capacity) || 1
  room.price_per_day = Number(data.price_per_day) || 0
  room.is_active = data.is_active ? 1 : 0
  room.description = data.description?.trim() || null
  save(db)
  return { ok: true, message: 'Kamar berhasil diperbarui.' }
}

export function deleteHotelRoom(id) {
  const db = load()
  const used = (db.hotel_bookings || []).some((b) => b.room_id === Number(id) && ['reserved', 'checked_in'].includes(b.status))
  if (used) return { ok: false, message: 'Kamar tidak bisa dihapus: masih ada penitipan aktif/reservasi.' }
  const room = db.hotel_rooms.find((r) => r.id === Number(id))
  if (!room) return { ok: false, message: 'Kamar tidak ditemukan.' }
  // soft-deactivate if pernah dipakai
  if ((db.hotel_bookings || []).some((b) => b.room_id === Number(id))) {
    room.is_active = 0
    save(db)
    return { ok: true, message: 'Kamar dinonaktifkan (sudah pernah dipakai).' }
  }
  db.hotel_rooms = db.hotel_rooms.filter((r) => r.id !== Number(id))
  save(db)
  return { ok: true, message: 'Kamar berhasil dihapus.' }
}

export function getHotelBookings({ status = '', search = '', dateFrom = '', dateTo = '' } = {}) {
  const db = load()
  let rows = (db.hotel_bookings || []).map((b) => enrichBooking(b, db))
  if (status) rows = rows.filter((b) => b.status === status)
  if (dateFrom) rows = rows.filter((b) => b.check_in_date >= dateFrom)
  if (dateTo) rows = rows.filter((b) => b.check_in_date <= dateTo)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (b) =>
        b.booking_number.toLowerCase().includes(q) ||
        (b.owner_name || '').toLowerCase().includes(q) ||
        (b.pet_name || '').toLowerCase().includes(q) ||
        (b.owner_phone || '').includes(q) ||
        (b.room_code || '').toLowerCase().includes(q)
    )
  }
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return rows
}

export function getHotelBooking(id) {
  const db = load()
  const b = (db.hotel_bookings || []).find((x) => x.id === Number(id))
  if (!b) return { ok: false, message: 'Booking tidak ditemukan.' }
  return { ok: true, booking: enrichBooking(b, db) }
}

export function createHotelBooking(data, currentUser) {
  const db = load()
  const room = db.hotel_rooms.find((r) => r.id === Number(data.room_id) && r.is_active)
  if (!room) return { ok: false, message: 'Kamar tidak tersedia.' }
  if (!data.check_in_date || !data.check_out_date) return { ok: false, message: 'Tanggal check-in/out wajib diisi.' }
  if (data.check_out_date <= data.check_in_date) return { ok: false, message: 'Tanggal check-out harus setelah check-in.' }
  if ((db.hotel_bookings || []).some((b) => bookingOverlaps(b, room.id, data.check_in_date, data.check_out_date))) {
    return { ok: false, message: 'Kamar sudah terisi pada periode tersebut.' }
  }

  const days = calcDays(data.check_in_date, data.check_out_date)
  const price_per_day = Number(data.price_per_day) || room.price_per_day
  const extra_fee = Number(data.extra_fee) || 0
  const discount = Number(data.discount) || 0
  const total = Math.max(0, days * price_per_day + extra_fee - discount)
  const status = data.status === 'checked_in' ? 'checked_in' : 'reserved'

  const id = nextId(db.hotel_bookings)
  const booking = {
    id,
    booking_number: generateBookingNumber(db, data.check_in_date),
    room_id: room.id,
    owner_name: data.owner_name.trim(),
    owner_phone: data.owner_phone?.trim() || null,
    pet_name: data.pet_name.trim(),
    pet_type: data.pet_type || room.pet_type,
    pet_breed: data.pet_breed?.trim() || null,
    pet_notes: data.pet_notes?.trim() || null,
    check_in_date: data.check_in_date,
    check_out_date: data.check_out_date,
    actual_check_in: status === 'checked_in' ? nowIso() : null,
    actual_check_out: null,
    days,
    price_per_day,
    extra_fee,
    discount,
    total,
    status,
    payment_status: data.payment_status || 'unpaid',
    payment_method: data.payment_method || null,
    notes: data.notes?.trim() || null,
    user_id: currentUser?.id ?? null,
    created_at: nowIso(),
  }
  db.hotel_bookings.push(booking)
  pushLog(db, {
    user: currentUser,
    action: 'create',
    module: 'hotel',
    description: `${currentUser?.name || 'Petugas'} membuat penitipan ${booking.pet_name} (${booking.booking_number})`,
    meta: { booking_number: booking.booking_number },
  })
  save(db)
  return { ok: true, message: 'Booking penitipan berhasil dibuat.', id }
}

export function updateHotelBooking(id, data) {
  const db = load()
  const b = db.hotel_bookings.find((x) => x.id === Number(id))
  if (!b) return { ok: false, message: 'Booking tidak ditemukan.' }
  if (['checked_out', 'cancelled'].includes(b.status)) {
    return { ok: false, message: 'Booking yang sudah selesai/dibatalkan tidak bisa diubah.' }
  }

  const roomId = Number(data.room_id) || b.room_id
  const checkIn = data.check_in_date || b.check_in_date
  const checkOut = data.check_out_date || b.check_out_date
  if (checkOut <= checkIn) return { ok: false, message: 'Tanggal check-out harus setelah check-in.' }

  const room = db.hotel_rooms.find((r) => r.id === roomId)
  if (!room) return { ok: false, message: 'Kamar tidak ditemukan.' }
  if ((db.hotel_bookings || []).some((x) => bookingOverlaps(x, roomId, checkIn, checkOut, id))) {
    return { ok: false, message: 'Kamar sudah terisi pada periode tersebut.' }
  }

  const days = calcDays(checkIn, checkOut)
  const price_per_day = Number(data.price_per_day) || b.price_per_day
  const extra_fee = Number(data.extra_fee) || 0
  const discount = Number(data.discount) || 0

  b.room_id = roomId
  b.owner_name = data.owner_name.trim()
  b.owner_phone = data.owner_phone?.trim() || null
  b.pet_name = data.pet_name.trim()
  b.pet_type = data.pet_type || b.pet_type
  b.pet_breed = data.pet_breed?.trim() || null
  b.pet_notes = data.pet_notes?.trim() || null
  b.check_in_date = checkIn
  b.check_out_date = checkOut
  b.days = days
  b.price_per_day = price_per_day
  b.extra_fee = extra_fee
  b.discount = discount
  b.total = Math.max(0, days * price_per_day + extra_fee - discount)
  b.payment_status = data.payment_status || b.payment_status
  b.payment_method = data.payment_method || b.payment_method
  b.notes = data.notes?.trim() || null
  save(db)
  return { ok: true, message: 'Booking berhasil diperbarui.' }
}

export function checkInHotelBooking(id) {
  const db = load()
  const b = db.hotel_bookings.find((x) => x.id === Number(id))
  if (!b) return { ok: false, message: 'Booking tidak ditemukan.' }
  if (b.status !== 'reserved') return { ok: false, message: 'Hanya reservasi yang bisa check-in.' }
  // pastikan kamar tidak bentrok dengan checked_in lain
  const clash = db.hotel_bookings.some(
    (x) => x.id !== b.id && x.status === 'checked_in' && x.room_id === b.room_id
  )
  if (clash) return { ok: false, message: 'Kamar masih ditempati penitipan lain.' }
  b.status = 'checked_in'
  b.actual_check_in = nowIso()
  pushLog(db, {
    action: 'checkin',
    module: 'hotel',
    description: `Check-in hewan ${b.pet_name} (${b.booking_number})`,
    meta: { booking_number: b.booking_number },
  })
  save(db)
  return { ok: true, message: `${b.pet_name} berhasil check-in.` }
}

export function checkOutHotelBooking(id, { payment_method = 'cash', payment_status = 'paid', extra_fee } = {}) {
  const db = load()
  const b = db.hotel_bookings.find((x) => x.id === Number(id))
  if (!b) return { ok: false, message: 'Booking tidak ditemukan.' }
  if (b.status !== 'checked_in') return { ok: false, message: 'Hanya penitipan aktif yang bisa check-out.' }
  if (extra_fee !== undefined && extra_fee !== null) {
    b.extra_fee = Number(extra_fee) || 0
    b.total = Math.max(0, b.days * b.price_per_day + b.extra_fee - (b.discount || 0))
  }
  b.status = 'checked_out'
  b.actual_check_out = nowIso()
  b.payment_status = payment_status
  b.payment_method = payment_method
  pushLog(db, {
    action: 'checkout',
    module: 'hotel',
    description: `Check-out hewan ${b.pet_name} (${b.booking_number}), total Rp ${Math.round(b.total).toLocaleString('id-ID')}`,
    meta: { booking_number: b.booking_number, total: b.total },
  })
  if (payment_method === 'cash' && payment_status === 'paid' && Number(b.total) > 0) {
    applyCashMovement(db, {
      type: 'hotel_cash',
      amount: b.total,
      note: `Titip hewan tunai ${b.booking_number} (${b.pet_name})`,
      reference: b.booking_number,
      created_at: b.actual_check_out,
    })
  }
  save(db)
  return { ok: true, message: `${b.pet_name} berhasil check-out.`, booking: enrichBooking(b, db) }
}

export function cancelHotelBooking(id) {
  const db = load()
  const b = db.hotel_bookings.find((x) => x.id === Number(id))
  if (!b) return { ok: false, message: 'Booking tidak ditemukan.' }
  if (!['reserved', 'checked_in'].includes(b.status)) {
    return { ok: false, message: 'Booking ini tidak bisa dibatalkan.' }
  }
  b.status = 'cancelled'
  pushLog(db, {
    action: 'cancel',
    module: 'hotel',
    description: `Membatalkan penitipan ${b.pet_name} (${b.booking_number})`,
    meta: { booking_number: b.booking_number },
  })
  save(db)
  return { ok: true, message: 'Booking dibatalkan.' }
}

/* ============ STOK OPNAME ============ */

function enrichOpname(o, db) {
  const user = db.users.find((u) => u.id === o.user_id)
  const items = (db.stock_opname_items || []).filter((i) => i.opname_id === o.id)
  const matched = items.filter((i) => i.difference === 0).length
  const plus = items.filter((i) => i.difference > 0).length
  const minus = items.filter((i) => i.difference < 0).length
  return {
    ...o,
    cashier_name: user?.name ?? '-',
    item_count: items.length,
    matched,
    plus,
    minus,
  }
}

function generateOpnameNumber(db) {
  const today = todayStr().replace(/-/g, '')
  const prefix = `SO-${today}-`
  const count = (db.stock_opnames || []).filter((o) => o.opname_number.startsWith(prefix)).length
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

export function getStockOpnames({ status = '' } = {}) {
  const db = load()
  let rows = (db.stock_opnames || []).map((o) => enrichOpname(o, db))
  if (status) rows = rows.filter((o) => o.status === status)
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return rows
}

export function getStockOpname(id) {
  const db = load()
  const o = (db.stock_opnames || []).find((x) => x.id === Number(id))
  if (!o) return { ok: false, message: 'Stok opname tidak ditemukan.' }
  const items = (db.stock_opname_items || [])
    .filter((i) => i.opname_id === o.id)
    .sort((a, b) => (a.product_name > b.product_name ? 1 : -1))
  return { ok: true, opname: enrichOpname(o, db), items }
}

/** Admin: buat draft opname — snapshot stok sistem saat ini */
export function createStockOpname({ notes = '' } = {}, currentUser) {
  const db = load()
  const open = (db.stock_opnames || []).find((o) => o.status === 'draft')
  if (open) {
    return { ok: false, message: `Masih ada draft ${open.opname_number}. Selesaikan atau batalkan dulu.`, id: open.id }
  }

  const products = db.products.filter((p) => p.is_active)
  if (!products.length) return { ok: false, message: 'Tidak ada produk aktif untuk dihitung.' }

  const id = nextId(db.stock_opnames)
  const created_at = nowIso()
  const opname_number = generateOpnameNumber(db)
  db.stock_opnames.push({
    id,
    opname_number,
    status: 'draft',
    notes: notes?.trim() || null,
    user_id: currentUser?.id ?? null,
    created_at,
    completed_at: null,
  })

  let itemId = nextId(db.stock_opname_items)
  products.forEach((p) => {
    db.stock_opname_items.push({
      id: itemId++,
      opname_id: id,
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      system_stock: p.stock,
      physical_stock: p.stock,
      difference: 0,
      notes: null,
    })
  })

  pushLog(db, {
    user: currentUser,
    action: 'opname_create',
    module: 'stock_opname',
    description: `${currentUser?.name || 'Admin'} memulai stok opname ${opname_number}`,
    meta: { opname_number },
  })
  save(db)
  return { ok: true, message: 'Draft stok opname dibuat. Silakan isi hitungan fisik.', id }
}

/** Admin: simpan hitungan fisik (draft) */
export function saveStockOpnameItems(id, items, notes) {
  const db = load()
  const o = db.stock_opnames.find((x) => x.id === Number(id))
  if (!o) return { ok: false, message: 'Stok opname tidak ditemukan.' }
  if (o.status !== 'draft') return { ok: false, message: 'Hanya draft yang bisa diubah.' }

  if (notes !== undefined) o.notes = notes?.trim() || null

  const byId = new Map((items || []).map((i) => [Number(i.id), i]))
  db.stock_opname_items
    .filter((i) => i.opname_id === o.id)
    .forEach((row) => {
      const incoming = byId.get(row.id)
      if (!incoming) return
      const physical = Math.max(0, Number(incoming.physical_stock) || 0)
      row.physical_stock = physical
      row.difference = physical - row.system_stock
      row.notes = incoming.notes?.trim() || null
    })

  save(db)
  return { ok: true, message: 'Hitungan disimpan (draft).' }
}

/** Admin: selesaikan — update stok produk sesuai fisik */
export function completeStockOpname(id, items, notes) {
  const db = load()
  const o = db.stock_opnames.find((x) => x.id === Number(id))
  if (!o) return { ok: false, message: 'Stok opname tidak ditemukan.' }
  if (o.status !== 'draft') return { ok: false, message: 'Opname ini sudah selesai atau dibatalkan.' }

  // simpan dulu
  if (notes !== undefined) o.notes = notes?.trim() || null
  const byId = new Map((items || []).map((i) => [Number(i.id), i]))
  const rows = db.stock_opname_items.filter((i) => i.opname_id === o.id)
  rows.forEach((row) => {
    const incoming = byId.get(row.id)
    if (incoming) {
      row.physical_stock = Math.max(0, Number(incoming.physical_stock) || 0)
      row.difference = row.physical_stock - row.system_stock
      row.notes = incoming.notes?.trim() || null
    }
  })

  // terapkan ke stok produk
  rows.forEach((row) => {
    const prod = db.products.find((p) => p.id === row.product_id)
    if (prod) prod.stock = row.physical_stock
  })

  o.status = 'completed'
  o.completed_at = nowIso()
  const plus = rows.filter((r) => r.difference > 0).length
  const minus = rows.filter((r) => r.difference < 0).length
  pushLog(db, {
    action: 'opname_complete',
    module: 'stock_opname',
    description: `Menyelesaikan stok opname ${o.opname_number} (${plus} lebih, ${minus} kurang)`,
    meta: { opname_number: o.opname_number, plus, minus },
  })
  save(db)

  return {
    ok: true,
    message: `Stok opname selesai. Stok produk diperbarui (${plus} lebih, ${minus} kurang).`,
  }
}

export function cancelStockOpname(id) {
  const db = load()
  const o = db.stock_opnames.find((x) => x.id === Number(id))
  if (!o) return { ok: false, message: 'Stok opname tidak ditemukan.' }
  if (o.status !== 'draft') return { ok: false, message: 'Hanya draft yang bisa dibatalkan.' }
  o.status = 'cancelled'
  pushLog(db, {
    action: 'opname_cancel',
    module: 'stock_opname',
    description: `Membatalkan draft stok opname ${o.opname_number}`,
    meta: { opname_number: o.opname_number },
  })
  save(db)
  return { ok: true, message: 'Draft stok opname dibatalkan.' }
}
