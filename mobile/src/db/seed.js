// Data awal (seed) - identik dengan database/sql/seed.sql pada versi Laravel.
// Password disimpan apa adanya karena ini hanya untuk uji coba lokal di perangkat.

export const SEED = {
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
};
