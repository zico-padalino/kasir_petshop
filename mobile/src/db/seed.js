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
    { id: 1, role_id: 1, name: 'Admin PetShop', email: 'admin@petshop.com', password: 'password', is_active: 1 },
    { id: 2, role_id: 2, name: 'Kasir PetShop', email: 'kasir@petshop.com', password: 'password', is_active: 1 },
    { id: 3, role_id: 3, name: 'Owner PetShop', email: 'owner@petshop.com', password: 'password', is_active: 1 },
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
  ].map((p, i) => ({ id: i + 1, is_active: 1, ...p })),

  transactions: [],
  transaction_items: [],
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

  return db
}

// SEED statis (master data tanpa transaksi) tetap diekspor bila diperlukan.
export const SEED = BASE
