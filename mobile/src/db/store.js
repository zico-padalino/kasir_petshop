// "Database" lokal berbasis localStorage (tersimpan di perangkat, untuk uji coba).
// Meniru struktur tabel & logika controller pada versi Laravel.

import { buildSeed } from './seed'

const DB_KEY = 'kasir_dzikra_db_v2'

function load() {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const fresh = buildSeed()
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
    return fresh
  }
  try {
    return JSON.parse(raw)
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
  const fresh = buildSeed()
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

  return {
    stats: { total_products, total_stock, today_transactions, today_revenue },
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
  db.categories.push({ id, name: name.trim(), description: description?.trim() || null })
  save(db)
  return { ok: true, message: 'Kategori berhasil ditambahkan.' }
}

export function updateCategory(id, { name, description }) {
  const db = load()
  const cat = db.categories.find((c) => c.id === Number(id))
  if (!cat) return { ok: false, message: 'Kategori tidak ditemukan.' }
  cat.name = name.trim()
  cat.description = description?.trim() || null
  save(db)
  return { ok: true, message: 'Kategori berhasil diperbarui.' }
}

export function deleteCategory(id) {
  const db = load()
  const used = db.products.some((p) => p.category_id === Number(id))
  if (used) return { ok: false, message: 'Kategori tidak dapat dihapus karena masih memiliki produk.' }
  db.categories = db.categories.filter((c) => c.id !== Number(id))
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
    rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }
  return rows.sort((a, b) => (a.name > b.name ? 1 : -1))
}

// produk untuk POS: aktif & stok > 0
export function getPosProducts({ search = '', categoryId = '' } = {}) {
  return getProducts({ search, categoryId }).filter((p) => p.is_active && p.stock > 0)
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
  db.products.push({
    id,
    category_id: Number(data.category_id),
    sku,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    price: Number(data.price) || 0,
    stock: Number(data.stock) || 0,
    is_active: data.is_active ? 1 : 0,
  })
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
  prod.category_id = Number(data.category_id)
  prod.sku = sku
  prod.name = data.name.trim()
  prod.description = data.description?.trim() || null
  prod.price = Number(data.price) || 0
  prod.stock = Number(data.stock) || 0
  prod.is_active = data.is_active ? 1 : 0
  save(db)
  return { ok: true, message: 'Produk berhasil diperbarui.' }
}

export function addStock(id, amount) {
  const db = load()
  const prod = db.products.find((p) => p.id === Number(id))
  if (!prod) return { ok: false, message: 'Produk tidak ditemukan.' }
  prod.stock += Number(amount) || 0
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
    save(db)
    return { ok: true, message: 'Produk dinonaktifkan (sudah pernah terjual).' }
  }
  db.products = db.products.filter((p) => p.id !== Number(id))
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
  save(db)
  return { ok: true, message: 'Pengguna berhasil diperbarui.' }
}

export function deleteUser(id, currentUser) {
  const db = load()
  if (Number(id) === currentUser?.id) {
    return { ok: false, message: 'Anda tidak dapat menghapus akun sendiri.' }
  }
  db.users = db.users.filter((u) => u.id !== Number(id))
  save(db)
  return { ok: true, message: 'Pengguna berhasil dihapus.' }
}
