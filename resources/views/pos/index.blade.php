@extends('layouts.app')
@section('title', 'Kasir POS')
@section('page-title', 'Kasir / POS')

@section('content')
<div class="pos-layout">
    <div>
        {{-- Filter kategori cepat --}}
        <div class="category-tabs">
            <a href="{{ route('pos.index', request()->only('search')) }}"
               class="category-tab {{ !$categoryId ? 'active' : '' }}">Semua</a>
            @foreach($categories as $cat)
            <a href="{{ route('pos.index', array_merge(request()->only('search'), ['category' => $cat->id])) }}"
               class="category-tab {{ $categoryId == $cat->id ? 'active' : '' }}">{{ $cat->name }}</a>
            @endforeach
        </div>

        <div class="search-bar">
            <form method="GET" action="{{ route('pos.index') }}" style="display:flex;gap:10px;flex-wrap:wrap;width:100%">
                @if($categoryId)<input type="hidden" name="category" value="{{ $categoryId }}">@endif
                <input type="text" name="search" id="searchInput" class="form-control" placeholder="Cari produk / SKU / scan barcode..." value="{{ $search }}" autofocus>
                <button type="submit" class="btn btn-primary"><i class="bi bi-search"></i> Cari</button>
            </form>
        </div>

        @if(count($products) > 0)
        <div class="product-grid">
            @foreach($products as $product)
            <div class="product-card"
                 data-id="{{ $product->id }}"
                 data-name="{{ $product->name }}"
                 data-price="{{ $product->price }}"
                 data-stock="{{ $product->stock }}"
                 data-sku="{{ $product->sku }}"
                 onclick="addToCart(this)">
                <div class="product-icon">{{ match(true) {
                    str_contains(strtolower($product->category_name), 'makanan') => '🍖',
                    str_contains(strtolower($product->category_name), 'aksesoris') => '🎀',
                    str_contains(strtolower($product->category_name), 'perawatan') => '🧴',
                    str_contains(strtolower($product->category_name), 'mainan') => '🎾',
                    default => '📦',
                } }}</div>
                <div class="product-name">{{ $product->name }}</div>
                <div class="product-price">Rp {{ number_format($product->price, 0, ',', '.') }}</div>
                <div class="product-stock">Stok: {{ $product->stock }} · {{ $product->sku }}</div>
            </div>
            @endforeach
        </div>
        @else
        <div class="card"><div class="empty-state"><i class="bi bi-inbox"></i>Tidak ada produk ditemukan</div></div>
        @endif
    </div>

    <div class="cart-panel">
        <div class="cart-header">
            <span><i class="bi bi-cart3"></i> Keranjang (<span id="cartCount">0</span> item)</span>
            <button class="btn btn-sm btn-outline" onclick="clearCart()" id="clearCartBtn" style="display:none">
                <i class="bi bi-trash"></i> Kosongkan
            </button>
        </div>
        <div class="cart-items" id="cartItems">
            <div class="empty-state" style="padding:20px"><i class="bi bi-cart"></i>Keranjang kosong<br><small>Klik produk untuk menambahkan</small></div>
        </div>
        <div class="cart-footer">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
                <span>Subtotal</span><span id="subtotalDisplay">Rp 0</span>
            </div>
            <div class="form-group" style="margin-bottom:8px">
                <label class="form-label" style="font-size:12px">Diskon (Rp)</label>
                <input type="number" id="discountInput" class="form-control" value="0" min="0" oninput="updateTotal()">
            </div>
            <div class="cart-total">
                <span>Total</span><span id="totalDisplay">Rp 0</span>
            </div>
            <button class="btn btn-success" style="width:100%;justify-content:center;padding:12px;margin-top:8px" onclick="openCheckout()" id="checkoutBtn" disabled>
                <i class="bi bi-credit-card"></i> Bayar (F2)
            </button>
        </div>
    </div>
</div>

{{-- Modal Checkout --}}
<div class="modal-overlay" id="checkoutModal">
    <div class="modal-box">
        <h3 style="margin-top:0"><i class="bi bi-credit-card"></i> Checkout</h3>
        <div class="form-group">
            <label class="form-label">Nama Pelanggan (opsional)</label>
            <input type="text" id="customerName" class="form-control" placeholder="Nama pelanggan">
        </div>
        <div class="form-group">
            <label class="form-label">Metode Pembayaran</label>
            <select id="paymentMethod" class="form-control" onchange="toggleCashInput()">
                <option value="cash">💵 Tunai</option>
                <option value="transfer">🏦 Transfer</option>
                <option value="qris">📱 QRIS</option>
            </select>
        </div>
        <div class="form-group" id="cashGroup">
            <label class="form-label">Uang Diterima (Rp)</label>
            <div class="quick-cash">
                <button type="button" onclick="setQuickCash(50000)">50rb</button>
                <button type="button" onclick="setQuickCash(100000)">100rb</button>
                <button type="button" onclick="setQuickCash(200000)">200rb</button>
                <button type="button" onclick="setExactCash()">Pas</button>
            </div>
            <input type="number" id="cashReceived" class="form-control" min="0" oninput="calcChange()">
            <div style="margin-top:8px;font-size:14px">
                Kembalian: <strong id="changeDisplay">Rp 0</strong>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Catatan (opsional)</label>
            <textarea id="notes" class="form-control" rows="2"></textarea>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="closeCheckout()">Batal</button>
            <button class="btn btn-success" style="flex:1;justify-content:center" onclick="processCheckout()" id="payBtn">
                <i class="bi bi-check-lg"></i> Proses Bayar
            </button>
        </div>
    </div>
</div>

{{-- Modal Sukses --}}
<div class="modal-overlay" id="successModal">
    <div class="modal-box" style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">✅</div>
        <h3 style="color:#28a745">Transaksi Berhasil!</h3>
        <p id="successInvoice" style="font-size:16px;font-weight:600"></p>
        <p id="successTotal" style="font-size:20px;color:var(--primary)"></p>
        <p id="successChange" style="font-size:14px;color:#666"></p>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:center">
            <button class="btn btn-primary" onclick="printReceipt()"><i class="bi bi-printer"></i> Cetak Struk</button>
            <button class="btn btn-outline" onclick="closeSuccess()">Transaksi Baru</button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
let cart = [];
let lastTransactionId = null;

function addToCart(el) {
    const id = parseInt(el.dataset.id);
    const name = el.dataset.name;
    const price = parseFloat(el.dataset.price);
    const stock = parseInt(el.dataset.stock);

    const existing = cart.find(i => i.product_id === id);
    if (existing) {
        if (existing.qty >= stock) { alert('Stok tidak cukup!'); return; }
        existing.qty++;
    } else {
        cart.push({ product_id: id, name, price, stock, qty: 1 });
    }
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.product_id !== id);
    renderCart();
}

function clearCart() {
    if (cart.length && !confirm('Kosongkan keranjang?')) return;
    cart = [];
    renderCart();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.product_id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(id);
    else if (item.qty > item.stock) { item.qty = item.stock; alert('Stok maksimum tercapai!'); }
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const count = cart.reduce((s, i) => s + i.qty, 0);
    document.getElementById('cartCount').textContent = count;
    document.getElementById('clearCartBtn').style.display = cart.length ? 'inline-flex' : 'none';

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:20px"><i class="bi bi-cart"></i>Keranjang kosong<br><small>Klik produk untuk menambahkan</small></div>';
        document.getElementById('checkoutBtn').disabled = true;
        updateTotal();
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatRupiah(item.price)} × ${item.qty} = ${formatRupiah(item.price * item.qty)}</div>
            </div>
            <div class="cart-qty">
                <button onclick="changeQty(${item.product_id}, -1)">−</button>
                <span>${item.qty}</span>
                <button onclick="changeQty(${item.product_id}, 1)">+</button>
                <button onclick="removeFromCart(${item.product_id})" style="color:#dc3545;margin-left:4px" title="Hapus">×</button>
            </div>
        </div>
    `).join('');

    document.getElementById('checkoutBtn').disabled = false;
    updateTotal();
}

function getSubtotal() { return cart.reduce((s, i) => s + (i.price * i.qty), 0); }

function getTotal() {
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    return Math.max(0, getSubtotal() - discount);
}

function updateTotal() {
    document.getElementById('subtotalDisplay').textContent = formatRupiah(getSubtotal());
    document.getElementById('totalDisplay').textContent = formatRupiah(getTotal());
    calcChange();
}

function openCheckout() {
    if (!cart.length) return;
    document.getElementById('checkoutModal').classList.add('show');
    document.getElementById('cashReceived').value = Math.ceil(getTotal() / 1000) * 1000 || '';
    calcChange();
    document.getElementById('customerName').focus();
}

function closeCheckout() { document.getElementById('checkoutModal').classList.remove('show'); }

function toggleCashInput() {
    document.getElementById('cashGroup').style.display =
        document.getElementById('paymentMethod').value === 'cash' ? 'block' : 'none';
}

function setQuickCash(amount) {
    document.getElementById('cashReceived').value = amount;
    calcChange();
}

function setExactCash() {
    document.getElementById('cashReceived').value = getTotal();
    calcChange();
}

function calcChange() {
    const cash = parseFloat(document.getElementById('cashReceived').value) || 0;
    document.getElementById('changeDisplay').textContent = formatRupiah(Math.max(0, cash - getTotal()));
}

async function processCheckout() {
    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    const paymentMethod = document.getElementById('paymentMethod').value;

    try {
        const res = await fetch('{{ route("pos.checkout") }}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                items: cart.map(i => ({ product_id: i.product_id, qty: i.qty })),
                discount: parseFloat(document.getElementById('discountInput').value) || 0,
                payment_method: paymentMethod,
                cash_received: paymentMethod === 'cash' ? parseFloat(document.getElementById('cashReceived').value) : null,
                customer_name: document.getElementById('customerName').value,
                notes: document.getElementById('notes').value,
            }),
        });

        const data = await res.json();

        if (data.success) {
            lastTransactionId = data.transaction_id;
            closeCheckout();
            document.getElementById('successInvoice').textContent = data.invoice_number;
            document.getElementById('successTotal').textContent = formatRupiah(data.total);
            document.getElementById('successChange').textContent = data.change_amount !== null
                ? 'Kembalian: ' + formatRupiah(data.change_amount) : '';
            document.getElementById('successModal').classList.add('show');
        } else {
            alert(data.message || 'Transaksi gagal');
        }
    } catch (e) {
        alert('Terjadi kesalahan. Silakan coba lagi.');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Proses Bayar';
}

function printReceipt() {
    if (lastTransactionId) {
        window.open('/transactions/' + lastTransactionId + '/receipt', '_blank');
    }
}

function closeSuccess() {
    document.getElementById('successModal').classList.remove('show');
    cart = [];
    lastTransactionId = null;
    document.getElementById('discountInput').value = 0;
    document.getElementById('customerName').value = '';
    document.getElementById('notes').value = '';
    renderCart();
    location.reload();
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === 'F2' && cart.length) { e.preventDefault(); openCheckout(); }
    if (e.key === 'Escape') { closeCheckout(); document.getElementById('successModal').classList.remove('show'); }
});

// Enter on search = submit
document.getElementById('searchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.target.closest('form').submit();
});
</script>
@endpush
