// "Database" lokal berbasis localStorage (tersimpan di perangkat, untuk uji coba).
// Meniru struktur tabel & logika controller pada versi Laravel.

import { buildSeed } from './seed'

const DB_KEY = 'kasir_dzikra_db_v3'

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
  // pastikan tiap produk punya barcode (untuk scan kasir)
  if (Array.isArray(db.products)) {
    db.products.forEach((p, i) => {
      if (!p.barcode) {
        p.barcode = `8991001${String(p.id || i + 1).padStart(6, '0')}`
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
    return ensureSchema(JSON.parse(raw))
  } catch {
    const fresh = buildSeed()
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
    return fresh
  }
}

function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
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

/** Cari produk aktif lewat barcode atau SKU (untuk scan kasir) */
export function findProductByScan(code) {
  const q = String(code || '').trim()
  if (!q) return { ok: false, message: 'Kode kosong.' }
  const db = load()
  const upper = q.toUpperCase()
  const prod = db.products.find(
    (p) =>
      p.is_active &&
      ((p.barcode && String(p.barcode).trim() === q) ||
        (p.sku && String(p.sku).trim().toUpperCase() === upper))
  )
  if (!prod) return { ok: false, message: `Barang tidak ditemukan: ${q}` }
  if (prod.stock <= 0) return { ok: false, message: `"${prod.name}" stok habis.` }
  const cat = db.categories.find((c) => c.id === prod.category_id)
  return {
    ok: true,
    product: {
      ...prod,
      category_name: cat?.name ?? '',
    },
  }
}

export function getProduct(id) {
  return load().products.find((p) => p.id === Number(id)) || null
}

export function createProduct(data) {
  const db = load()
  const sku = data.sku.trim().toUpperCase()
  if (db.products.some((p) => p.sku === sku)) {
    return { ok: false, message: 'SKU sudah digunakan.' }
  }
  const id = nextId(db.products)
  const barcode = (data.barcode || '').trim() || `8991001${String(id).padStart(6, '0')}`
  if (db.products.some((p) => p.barcode && p.barcode === barcode)) {
    return { ok: false, message: 'Barcode sudah digunakan.' }
  }
  db.products.push({
    id,
    category_id: Number(data.category_id),
    sku,
    barcode,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    price: Number(data.price) || 0,
    stock: Number(data.stock) || 0,
    is_active: data.is_active ? 1 : 0,
  })
  pushLog(db, { action: 'create', module: 'product', description: `Menambah produk "${data.name.trim()}" (${sku})` })
  save(db)
  return { ok: true, message: 'Produk berhasil ditambahkan.' }
}

export function updateProduct(id, data) {
  const db = load()
  const prod = db.products.find((p) => p.id === Number(id))
  if (!prod) return { ok: false, message: 'Produk tidak ditemukan.' }
  const sku = data.sku.trim().toUpperCase()
  if (db.products.some((p) => p.sku === sku && p.id !== Number(id))) {
    return { ok: false, message: 'SKU sudah digunakan produk lain.' }
  }
  const barcode = (data.barcode || '').trim() || prod.barcode || `8991001${String(prod.id).padStart(6, '0')}`
  if (db.products.some((p) => p.barcode && p.barcode === barcode && p.id !== Number(id))) {
    return { ok: false, message: 'Barcode sudah digunakan produk lain.' }
  }
  prod.category_id = Number(data.category_id)
  prod.sku = sku
  prod.barcode = barcode
  prod.name = data.name.trim()
  prod.description = data.description?.trim() || null
  prod.price = Number(data.price) || 0
  prod.stock = Number(data.stock) || 0
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
      role_name: role?.name ?? '-',
      role_slug: role?.slug ?? '',
    }
  })
}

export function createUser(data) {
  const db = load()
  if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase().trim())) {
    return { ok: false, message: 'Email sudah digunakan.' }
  }
  if (!data.password) return { ok: false, message: 'Password wajib diisi.' }
  const id = nextId(db.users)
  db.users.push({
    id,
    role_id: Number(data.role_id),
    name: data.name.trim(),
    email: data.email.trim(),
    password: data.password,
    is_active: 1,
  })
  pushLog(db, { action: 'create', module: 'user', description: `Menambah pengguna "${data.name.trim()}"` })
  save(db)
  return { ok: true, message: 'Pengguna berhasil ditambahkan.' }
}

export function updateUser(id, data) {
  const db = load()
  const user = db.users.find((u) => u.id === Number(id))
  if (!user) return { ok: false, message: 'Pengguna tidak ditemukan.' }
  if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase().trim() && u.id !== Number(id))) {
    return { ok: false, message: 'Email sudah digunakan pengguna lain.' }
  }
  user.name = data.name.trim()
  user.email = data.email.trim()
  user.role_id = Number(data.role_id)
  user.is_active = data.is_active ? 1 : 0
  if (data.password) user.password = data.password
  pushLog(db, { action: 'update', module: 'user', description: `Mengubah pengguna "${user.name}"` })
  save(db)
  return { ok: true, message: 'Pengguna berhasil diperbarui.' }
}

export function deleteUser(id, currentUser) {
  const db = load()
  if (Number(id) === currentUser?.id) {
    return { ok: false, message: 'Anda tidak dapat menghapus akun sendiri.' }
  }
  const target = db.users.find((u) => u.id === Number(id))
  db.users = db.users.filter((u) => u.id !== Number(id))
  pushLog(db, { user: currentUser, action: 'delete', module: 'user', description: `Menghapus pengguna "${target?.name || id}"` })
  save(db)
  return { ok: true, message: 'Pengguna berhasil dihapus.' }
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
