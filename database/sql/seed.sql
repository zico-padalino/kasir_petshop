-- Seed data E-POS Pet Shop

INSERT INTO roles (name, slug, description) VALUES
('Administrator', 'admin', 'Akses penuh ke semua fitur sistem'),
('Kasir', 'kasir', 'Melakukan transaksi penjualan di kasir'),
('Owner', 'owner', 'Melihat laporan dan monitoring bisnis');

INSERT INTO categories (name, description) VALUES
('Makanan Hewan', 'Makanan kering dan basah untuk anjing, kucing, dll'),
('Aksesoris', 'Kalung, tali leash, baju, tempat tidur hewan'),
('Perawatan', 'Shampoo, vitamin, obat cacing, pasir kucing'),
('Mainan', 'Mainan untuk anjing dan kucing'),
('Kandang & Aquarium', 'Kandang, aquarium, dan perlengkapan');

INSERT INTO products (category_id, sku, name, description, price, stock) VALUES
(1, 'MK-001', 'Royal Canin Kitten 2kg', 'Makanan kucing kitten premium', 185000, 25),
(1, 'MK-002', 'Pro Plan Adult Dog 3kg', 'Makanan anjing dewasa rasa ayam', 220000, 18),
(1, 'MK-003', 'Whiskas Pouch 85g', 'Makanan basah kucing rasa tuna', 8500, 100),
(1, 'MK-004', 'Pedigree Adult 1.5kg', 'Makanan anjing ekonomis', 65000, 30),
(1, 'MK-005', 'Me-O Cat Food 7kg', 'Makanan kucing kering salmon', 145000, 15),
(2, 'AK-001', 'Kalung Anjing Kulit', 'Kalung anjing bahan kulit sintetis', 45000, 40),
(2, 'AK-002', 'Tali Leash Retractable', 'Tali jalan-jalan otomatis 5 meter', 85000, 20),
(2, 'AK-003', 'Baju Anjing Size M', 'Baju hangat untuk anjing medium', 55000, 12),
(2, 'AK-004', 'Tempat Tidur Kucing', 'Tempat tidur bulu lembut', 120000, 8),
(3, 'PR-001', 'Shampoo Anti Kutu', 'Shampoo anjing & kucing anti kutu', 35000, 35),
(3, 'PR-002', 'Vitamin Bulu Kucing', 'Suplemen vitamin untuk bulu sehat', 48000, 22),
(3, 'PR-003', 'Pasir Kucing 10L', 'Pasir gumpal wangi lavender', 42000, 50),
(3, 'PR-004', 'Obat Cacing Anjing', 'Obat cacing tablet 4 pcs', 28000, 45),
(4, 'MN-001', 'Bola Tennis Mainan Anjing', 'Bola tennis khusus hewan', 15000, 60),
(4, 'MN-002', 'Tongkat Bulu Mainan Kucing', 'Mainan tongkat dengan bulu', 25000, 35),
(4, 'MN-003', 'Bone Karet Anjing', 'Tulang karet tahan gigit', 32000, 28),
(5, 'KN-001', 'Kandang Anjing Medium', 'Kandang besi ukuran medium', 350000, 5),
(5, 'KN-002', 'Aquarium 40cm', 'Aquarium kaca dengan filter', 280000, 4);
