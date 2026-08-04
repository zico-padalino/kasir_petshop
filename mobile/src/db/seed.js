// Data awal (seed) - master data identik dengan database/sql/seed.sql versi Laravel.
// Ditambah GENERATOR transaksi dummy agar Dashboard, Riwayat & Laporan langsung berisi
// saat uji coba. Password disimpan apa adanya karena hanya untuk uji coba lokal.

const BASE = {
  roles: [
    { id: 1, name: 'Administrator', slug: 'admin', description: 'Akses penuh ke semua fitur sistem' },
    { id: 2, name: 'Kasir', slug: 'kasir', description: 'Melakukan transaksi penjualan di kasir' },
    { id: 3, name: 'Owner', slug: 'owner', description: 'Melihat laporan dan monitoring bisnis' },
  ],

  users: [
    { id: 1, role_id: 1, name: 'Admin PetShop', email: 'admin@petshop.com', password: 'password', is_active: 1, device_barcode: 'DEV-ADMIN01' },
    { id: 2, role_id: 2, name: 'Kasir PetShop', email: 'kasir@petshop.com', password: 'password', is_active: 1, device_barcode: 'DEV-KASIR01' },
    { id: 3, role_id: 3, name: 'Owner PetShop', email: 'owner@petshop.com', password: 'password', is_active: 1, device_barcode: 'DEV-OWNER01' },
  ],

  categories: [
    { id: 1, name: 'Makanan Hewan', description: 'Makanan kering dan basah untuk anjing, kucing, dll' },
    { id: 2, name: 'Aksesoris', description: 'Kalung, tali leash, baju, tempat tidur hewan' },
    { id: 3, name: 'Perawatan', description: 'Shampoo, vitamin, obat cacing, pasir kucing' },
    { id: 4, name: 'Mainan', description: 'Mainan untuk anjing dan kucing' },
    { id: 5, name: 'Kandang & Aquarium', description: 'Kandang, aquarium, dan perlengkapan' },
  ],

  products: [
    { category_id: 1, sku: 'MK-001', name: 'Royal Canin Kitten 2kg', description: 'Makanan kucing kitten premium', price: 185000, stock: 25 },
    { category_id: 1, sku: 'MK-002', name: 'Pro Plan Adult Dog 3kg', description: 'Makanan anjing dewasa rasa ayam', price: 220000, stock: 18 },
    { category_id: 1, sku: 'MK-003', name: 'Whiskas Pouch 85g', description: 'Makanan basah kucing rasa tuna', price: 8500, stock: 100 },
    { category_id: 1, sku: 'MK-004', name: 'Pedigree Adult 1.5kg', description: 'Makanan anjing ekonomis', price: 65000, stock: 30 },
    { category_id: 1, sku: 'MK-005', name: 'Me-O Cat Food 7kg', description: 'Makanan kucing kering salmon', price: 145000, stock: 15 },
    { category_id: 2, sku: 'AK-001', name: 'Kalung Anjing Kulit', description: 'Kalung anjing bahan kulit sintetis', price: 45000, stock: 40 },
    { category_id: 2, sku: 'AK-002', name: 'Tali Leash Retractable', description: 'Tali jalan-jalan otomatis 5 meter', price: 85000, stock: 20 },
    { category_id: 2, sku: 'AK-003', name: 'Baju Anjing Size M', description: 'Baju hangat untuk anjing medium', price: 55000, stock: 12 },
    { category_id: 2, sku: 'AK-004', name: 'Tempat Tidur Kucing', description: 'Tempat tidur bulu lembut', price: 120000, stock: 8 },
    { category_id: 3, sku: 'PR-001', name: 'Shampoo Anti Kutu', description: 'Shampoo anjing & kucing anti kutu', price: 35000, stock: 35 },
    { category_id: 3, sku: 'PR-002', name: 'Vitamin Bulu Kucing', description: 'Suplemen vitamin untuk bulu sehat', price: 48000, stock: 22 },
    { category_id: 3, sku: 'PR-003', name: 'Pasir Kucing 10L', description: 'Pasir gumpal wangi lavender', price: 42000, stock: 50 },
    { category_id: 3, sku: 'PR-004', name: 'Obat Cacing Anjing', description: 'Obat cacing tablet 4 pcs', price: 28000, stock: 45 },
    { category_id: 4, sku: 'MN-001', name: 'Bola Tennis Mainan Anjing', description: 'Bola tennis khusus hewan', price: 15000, stock: 60 },
    { category_id: 4, sku: 'MN-002', name: 'Tongkat Bulu Mainan Kucing', description: 'Mainan tongkat dengan bulu', price: 25000, stock: 35 },
    { category_id: 4, sku: 'MN-003', name: 'Bone Karet Anjing', description: 'Tulang karet tahan gigit', price: 32000, stock: 28 },
    { category_id: 5, sku: 'KN-001', name: 'Kandang Anjing Medium', description: 'Kandang besi ukuran medium', price: 350000, stock: 5 },
    { category_id: 5, sku: 'KN-002', name: 'Aquarium 40cm', description: 'Aquarium kaca dengan filter', price: 280000, stock: 4 },
  ].map((p, i) => ({
    id: i + 1,
    is_active: 1,
    // barcode uji coba (EAN-13 fiktif) — bisa discan di kasir
    barcode: `8991001${String(i + 1).padStart(6, '0')}`,
    ...p,
  })),

  transactions: [],
  transaction_items: [],

  // Pet Hotel / Penitipan
  hotel_rooms: [
    { id: 1, code: 'A-01', name: 'Kamar Anjing Standar', pet_type: 'anjing', capacity: 1, price_per_day: 75000, is_active: 1, description: 'Kandang standar untuk anjing kecil–sedang' },
    { id: 2, code: 'A-02', name: 'Kamar Anjing Premium', pet_type: 'anjing', capacity: 1, price_per_day: 120000, is_active: 1, description: 'Ruangan lebih luas + AC' },
    { id: 3, code: 'A-03', name: 'Kamar Anjing Besar', pet_type: 'anjing', capacity: 1, price_per_day: 150000, is_active: 1, description: 'Untuk breed besar' },
    { id: 4, code: 'K-01', name: 'Kamar Kucing Standar', pet_type: 'kucing', capacity: 1, price_per_day: 65000, is_active: 1, description: 'Kandang kucing standar' },
    { id: 5, code: 'K-02', name: 'Kamar Kucing Premium', pet_type: 'kucing', capacity: 1, price_per_day: 100000, is_active: 1, description: 'Dengan tempat tidur & mainan' },
    { id: 6, code: 'K-03', name: 'Suite Kucing Twin', pet_type: 'kucing', capacity: 2, price_per_day: 140000, is_active: 1, description: 'Untuk 2 kucing dari 1 pemilik' },
    { id: 7, code: 'M-01', name: 'Kamar Multijenis', pet_type: 'semua', capacity: 1, price_per_day: 90000, is_active: 1, description: 'Anjing/kucing/kelinci kecil' },
    { id: 8, code: 'M-02', name: 'Kamar Multijenis 2', pet_type: 'semua', capacity: 1, price_per_day: 90000, is_active: 1, description: 'Cadangan multijenis' },
  ],

  hotel_bookings: [],
  held_orders: [],
  cash_drawer: { balance: 0, updated_at: null },
  cash_movements: [],

  stock_opnames: [],
  stock_opname_items: [],

  activity_logs: [],
  attendance_logs: [],
}

/* ---------- util generator ---------- */
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (arr) => arr[randInt(0, arr.length - 1)]

const CUSTOMERS = [null, null, null, 'Budi Santoso', 'Siti Aminah', 'Andi Wijaya', 'Dewi Lestari', 'Rina Marlina', 'Joko Susilo', 'Maya Putri', 'Agus Salim']
const METHODS = ['cash', 'cash', 'cash', 'cash', 'transfer', 'qris', 'qris']
const NOTES = [null, null, null, 'Pelanggan tetap', 'Beli untuk hadiah', 'Minta bonus sample', 'Pesan via WA']

const OWNER_NAMES = ['Budi Santoso', 'Siti Aminah', 'Andi Wijaya', 'Dewi Lestari', 'Rina Marlina', 'Joko Susilo', 'Maya Putri', 'Agus Salim', 'Fitri Handayani', 'Rudi Hartono']
const OWNER_PHONES = ['081234567890', '081298765432', '082112223333', '085611122233', '087812345678', '081355566677']
const PET_DOGS = [
  { name: 'Bruno', breed: 'Golden Retriever' },
  { name: 'Max', breed: 'Pomeranian' },
  { name: 'Rocky', breed: 'Bulldog' },
  { name: 'Coco', breed: 'Poodle' },
  { name: 'Bella', breed: 'Shih Tzu' },
]
const PET_CATS = [
  { name: 'Mochi', breed: 'Persia' },
  { name: 'Luna', breed: 'Angora' },
  { name: 'Oyen', breed: 'Kampung' },
  { name: 'Milo', breed: 'British Shorthair' },
  { name: 'Neko', breed: 'Ragdoll' },
]
const HOTEL_NOTES = [null, null, 'Bawa makanan sendiri', 'Alergi ayam', 'Pemalu, jangan digabung', 'Sudah vaksin lengkap', 'Suka main bola']

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00')
  const d2 = new Date(b + 'T00:00:00')
  return Math.max(1, Math.round((d2 - d1) / 86400000))
}

function dateAdd(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function generateHotelBookings(db) {
  const now = new Date()
  const rooms = db.hotel_rooms.filter((r) => r.is_active)
  const bookings = []
  let id = 1
  const dayCounter = {}

  // ~12 booking dummy: reserved, checked_in, checked_out
  const plans = [
    { status: 'checked_in', inOffset: -3, outOffset: 2 },
    { status: 'checked_in', inOffset: -1, outOffset: 3 },
    { status: 'checked_in', inOffset: 0, outOffset: 4 },
    { status: 'reserved', inOffset: 1, outOffset: 4 },
    { status: 'reserved', inOffset: 2, outOffset: 5 },
    { status: 'reserved', inOffset: 3, outOffset: 6 },
    { status: 'checked_out', inOffset: -10, outOffset: -7 },
    { status: 'checked_out', inOffset: -8, outOffset: -5 },
    { status: 'checked_out', inOffset: -6, outOffset: -3 },
    { status: 'checked_out', inOffset: -12, outOffset: -9 },
    { status: 'cancelled', inOffset: -4, outOffset: -1 },
    { status: 'reserved', inOffset: 5, outOffset: 8 },
  ]

  // track room occupancy for active stays to avoid double-booking same room
  const occupied = new Set()

  for (const plan of plans) {
    const check_in_date = dateAdd(now, plan.inOffset)
    const check_out_date = dateAdd(now, plan.outOffset)
    const days = daysBetween(check_in_date, check_out_date)

    let room = pick(rooms)
    if (plan.status === 'checked_in' || plan.status === 'reserved') {
      const free = rooms.filter((r) => !occupied.has(r.id))
      if (free.length) room = pick(free)
      occupied.add(room.id)
    }

    const petType = room.pet_type === 'semua' ? pick(['anjing', 'kucing']) : room.pet_type
    const pet = pick(petType === 'anjing' ? PET_DOGS : PET_CATS)
    const price_per_day = room.price_per_day
    const extra_fee = Math.random() < 0.25 ? pick([15000, 25000, 50000]) : 0
    const discount = Math.random() < 0.2 ? pick([10000, 20000]) : 0
    const total = Math.max(0, days * price_per_day + extra_fee - discount)

    const dayKey = check_in_date.replace(/-/g, '')
    dayCounter[dayKey] = (dayCounter[dayKey] || 0) + 1
    const booking_number = `PH-${dayKey}-${String(dayCounter[dayKey]).padStart(4, '0')}`

    const created = new Date(check_in_date + 'T00:00:00')
    created.setDate(created.getDate() - randInt(0, 3))
    created.setHours(randInt(9, 17), randInt(0, 59), 0, 0)

    let payment_status = 'unpaid'
    if (plan.status === 'checked_out') payment_status = 'paid'
    else if (plan.status === 'checked_in') payment_status = pick(['unpaid', 'partial', 'paid'])
    else if (plan.status === 'reserved') payment_status = pick(['unpaid', 'unpaid', 'partial'])

    bookings.push({
      id: id++,
      booking_number,
      room_id: room.id,
      owner_name: pick(OWNER_NAMES),
      owner_phone: pick(OWNER_PHONES),
      pet_name: pet.name,
      pet_type: petType,
      pet_breed: pet.breed,
      pet_notes: pick(HOTEL_NOTES),
      check_in_date,
      check_out_date,
      actual_check_in: plan.status === 'checked_in' || plan.status === 'checked_out'
        ? `${check_in_date} ${pad(randInt(8, 11))}:${pad(randInt(0, 59))}:00`
        : null,
      actual_check_out: plan.status === 'checked_out'
        ? `${check_out_date} ${pad(randInt(14, 18))}:${pad(randInt(0, 59))}:00`
        : null,
      days,
      price_per_day,
      extra_fee,
      discount,
      total,
      status: plan.status,
      payment_status,
      payment_method: payment_status === 'paid' ? pick(METHODS) : null,
      notes: plan.status === 'cancelled' ? 'Dibatalkan pemilik' : null,
      user_id: pick(db.users).id,
      created_at: fmtDate(created),
    })
  }

  db.hotel_bookings = bookings
}

// Buat 1 transaksi acak pada tanggal tertentu; mengurangi stok produk (tidak negatif).
function makeTransaction(products, users, date) {
  const nItems = randInt(1, 4)
  const chosen = []
  const pool = [...products]
  for (let i = 0; i < nItems && pool.length; i++) {
    const idx = randInt(0, pool.length - 1)
    const prod = pool.splice(idx, 1)[0]
    if (prod.stock <= 0) continue
    const qty = Math.min(prod.stock, randInt(1, 3))
    prod.stock -= qty
    chosen.push({ prod, qty, price: prod.price, subtotal: prod.price * qty })
  }
  if (!chosen.length) return null

  const subtotal = chosen.reduce((s, c) => s + c.subtotal, 0)
  let discount = 0
  if (subtotal >= 100000 && Math.random() < 0.3) discount = pick([5000, 10000, 15000, 20000])
  const total = Math.max(0, subtotal - discount)

  const payment_method = pick(METHODS)
  let cash_received = null
  let change_amount = null
  if (payment_method === 'cash') {
    const roundTo = pick([1000, 5000, 10000])
    cash_received = Math.ceil(total / roundTo) * roundTo
    if (cash_received < total) cash_received = total
    if (Math.random() < 0.25) cash_received = pick([50000, 100000, 150000, 200000, 300000]).valueOf()
    if (cash_received < total) cash_received = Math.ceil(total / 10000) * 10000
    change_amount = cash_received - total
  }

  const user = pick(users)

  return {
    tx: {
      user_id: user.id,
      subtotal,
      discount,
      total,
      payment_method,
      cash_received,
      change_amount,
      customer_name: pick(CUSTOMERS),
      notes: pick(NOTES),
      created_at: fmtDate(date),
    },
    items: chosen,
  }
}

// Bangun database lengkap + transaksi dummy (14 hari terakhir, termasuk hari ini).
export function buildSeed() {
  const db = JSON.parse(JSON.stringify(BASE))
  const days = 14

  const raw = []
  const now = new Date()
  for (let d = days; d >= 0; d--) {
    const count = d === 0 ? randInt(3, 6) : randInt(1, 4) // hari ini lebih ramai
    for (let k = 0; k < count; k++) {
      const date = new Date(now)
      date.setDate(now.getDate() - d)
      date.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0)
      const t = makeTransaction(db.products, db.users, date)
      if (t) raw.push(t)
    }
  }

  // urutkan menaik untuk penomoran invoice per hari
  raw.sort((a, b) => (a.tx.created_at < b.tx.created_at ? -1 : 1))

  const dayCounter = {}
  let txId = 1
  let itemId = 1
  for (const { tx, items } of raw) {
    const dayKey = tx.created_at.slice(0, 10).replace(/-/g, '')
    dayCounter[dayKey] = (dayCounter[dayKey] || 0) + 1
    const invoice_number = `INV-${dayKey}-${String(dayCounter[dayKey]).padStart(4, '0')}`

    const id = txId++
    db.transactions.push({ id, invoice_number, ...tx })
    for (const c of items) {
      db.transaction_items.push({
        id: itemId++,
        transaction_id: id,
        product_id: c.prod.id,
        product_name: c.prod.name,
        qty: c.qty,
        price: c.price,
        subtotal: c.subtotal,
        created_at: tx.created_at,
      })
    }
  }

  generateHotelBookings(db)
  generateStockOpnames(db)
  generateCashDrawer(db)
  generateActivityLogs(db)
  generateAttendanceLogs(db)
  return db
}

function generateCashDrawer(db) {
  let balance = 500000
  const movements = [{
    id: 1,
    type: 'cash_in',
    amount: 500000,
    direction: 'in',
    balance_after: 500000,
    note: 'Modal awal kasir (data contoh)',
    reference: null,
    user_id: db.users.find((u) => u.role_id === 1)?.id || 1,
    created_at: db.transactions[0]?.created_at || fmtDate(new Date()),
  }]
  let id = 2
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

  db.cash_drawer = { balance, updated_at: fmtDate(new Date()) }
  db.cash_movements = movements
}

function generateActivityLogs(db) {
  const logs = []
  let id = 1
  const roleOf = (uid) => {
    const u = db.users.find((x) => x.id === uid)
    const role = db.roles.find((r) => r.id === u?.role_id)
    return { name: u?.name || 'Sistem', slug: role?.slug || null, id: u?.id || null }
  }

  // login contoh
  db.users.forEach((u) => {
    const r = roleOf(u.id)
    const d = new Date()
    d.setDate(d.getDate() - randInt(0, 3))
    d.setHours(randInt(8, 10), randInt(0, 59), 0, 0)
    logs.push({
      id: id++,
      user_id: r.id,
      user_name: r.name,
      role_slug: r.slug,
      action: 'login',
      module: 'auth',
      description: `${r.name} masuk ke aplikasi`,
      meta: null,
      created_at: fmtDate(d),
    })
  })

  // penjualan dari transaksi (ambil 15 terakhir)
  ;[...db.transactions]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 15)
    .forEach((t) => {
      const r = roleOf(t.user_id)
      logs.push({
        id: id++,
        user_id: r.id,
        user_name: r.name,
        role_slug: r.slug,
        action: 'sale',
        module: 'pos',
        description: `${r.name} mencatat penjualan ${t.invoice_number} sebesar Rp ${Math.round(t.total).toLocaleString('id-ID')}`,
        meta: { invoice_number: t.invoice_number, total: t.total },
        created_at: t.created_at,
      })
    })

  // hotel
  db.hotel_bookings.slice(0, 8).forEach((b) => {
    const r = roleOf(b.user_id)
    const label =
      b.status === 'checked_in'
        ? `check-in ${b.pet_name}`
        : b.status === 'checked_out'
          ? `check-out ${b.pet_name}`
          : b.status === 'cancelled'
            ? `batalkan penitipan ${b.pet_name}`
            : `buat reservasi ${b.pet_name}`
    logs.push({
      id: id++,
      user_id: r.id,
      user_name: r.name,
      role_slug: r.slug,
      action: b.status === 'checked_in' ? 'checkin' : b.status === 'checked_out' ? 'checkout' : b.status === 'cancelled' ? 'cancel' : 'create',
      module: 'hotel',
      description: `${r.name} ${label} (${b.booking_number})`,
      meta: { booking_number: b.booking_number },
      created_at: b.created_at,
    })
  })

  // stok opname
  db.stock_opnames.forEach((o) => {
    const r = roleOf(o.user_id)
    logs.push({
      id: id++,
      user_id: r.id,
      user_name: r.name,
      role_slug: r.slug,
      action: o.status === 'completed' ? 'opname_complete' : 'opname_create',
      module: 'stock_opname',
      description: `${r.name} ${o.status === 'completed' ? 'menyelesaikan' : 'membuat'} stok opname ${o.opname_number}`,
      meta: { opname_number: o.opname_number },
      created_at: o.completed_at || o.created_at,
    })
  })

  logs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  // re-id after sort
  logs.forEach((l, i) => { l.id = i + 1 })
  db.activity_logs = logs
}

function generateStockOpnames(db) {
  const admin = db.users.find((u) => u.role_id === 1) || db.users[0]
  const products = db.products.filter((p) => p.is_active).slice(0, 12)
  if (!products.length) {
    db.stock_opnames = []
    db.stock_opname_items = []
    return
  }

  const past = new Date()
  past.setDate(past.getDate() - 7)
  past.setHours(10, 30, 0, 0)

  const dayKey = `${past.getFullYear()}${pad(past.getMonth() + 1)}${pad(past.getDate())}`
  const opname = {
    id: 1,
    opname_number: `SO-${dayKey}-0001`,
    status: 'completed',
    notes: 'Stok opname mingguan (data contoh)',
    user_id: admin.id,
    created_at: fmtDate(past),
    completed_at: fmtDate(past),
  }

  let itemId = 1
  const items = products.map((p) => {
    const system = p.stock
    const delta = pick([0, 0, 0, 0, -1, -2, 1, 2])
    const physical = Math.max(0, system + delta)
    const difference = physical - system
    return {
      id: itemId++,
      opname_id: 1,
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      system_stock: system,
      physical_stock: physical,
      difference,
      notes: difference < 0 ? 'Selisih kurang' : difference > 0 ? 'Selisih lebih' : null,
    }
  })

  db.stock_opnames = [opname]
  db.stock_opname_items = items
}

function generateAttendanceLogs(db) {
  const logs = []
  let id = 1
  const now = new Date()
  const staff = (db.users || []).filter((u) => u.is_active)

  for (let d = 5; d >= 0; d--) {
    for (const u of staff) {
      // owner kadang tidak absen
      if (u.role_id === 3 && d % 2 === 1) continue
      const day = new Date(now)
      day.setDate(now.getDate() - d)
      const inAt = new Date(day)
      inAt.setHours(randInt(7, 9), randInt(0, 59), randInt(0, 59), 0)
      const outAt = new Date(day)
      outAt.setHours(randInt(16, 19), randInt(0, 59), randInt(0, 59), 0)
      const role = db.roles.find((r) => r.id === u.role_id)
      const lat = -6.2 + Math.random() * 0.02
      const lng = 106.8 + Math.random() * 0.02
      logs.push({
        id: id++,
        user_id: u.id,
        user_name: u.name,
        role_slug: role?.slug ?? null,
        barcode: 'ABSEN-DZIKRA',
        type: 'in',
        selfie: null,
        latitude: lat,
        longitude: lng,
        accuracy: randInt(8, 40),
        scanned_by_user_id: u.id,
        note: null,
        meta: { source: 'seed' },
        created_at: fmtDate(inAt),
      })
      // hari ini belum pulang untuk kasir (demo status masuk)
      if (!(d === 0 && u.role_id === 2)) {
        logs.push({
          id: id++,
          user_id: u.id,
          user_name: u.name,
          role_slug: role?.slug ?? null,
          barcode: 'ABSEN-DZIKRA',
          type: 'out',
          selfie: null,
          latitude: lat + 0.001,
          longitude: lng + 0.001,
          accuracy: randInt(8, 40),
          scanned_by_user_id: u.id,
          note: null,
          meta: { source: 'seed' },
          created_at: fmtDate(outAt),
        })
      }
    }
  }

  logs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  logs.forEach((l, i) => { l.id = i + 1 })
  db.attendance_logs = logs
}

// SEED statis (master data tanpa transaksi) tetap diekspor bila diperlukan.
export const SEED = BASE
