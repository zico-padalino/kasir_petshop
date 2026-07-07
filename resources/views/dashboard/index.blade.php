@extends('layouts.app')
@section('title', 'Dashboard')
@section('page-title', 'Dashboard')

@section('content')
<div class="stat-grid">
    <div class="stat-card">
        <div class="stat-icon blue"><i class="bi bi-box-seam"></i></div>
        <div class="stat-info">
            <div class="stat-value">{{ $stats->total_products ?? 0 }}</div>
            <div class="stat-label">Total Produk Aktif</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon green"><i class="bi bi-stack"></i></div>
        <div class="stat-info">
            <div class="stat-value">{{ number_format($stats->total_stock ?? 0) }}</div>
            <div class="stat-label">Total Stok Barang</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon orange"><i class="bi bi-receipt"></i></div>
        <div class="stat-info">
            <div class="stat-value">{{ $stats->today_transactions ?? 0 }}</div>
            <div class="stat-label">Transaksi Hari Ini</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon teal"><i class="bi bi-currency-dollar"></i></div>
        <div class="stat-info">
            <div class="stat-value">Rp {{ number_format($stats->today_revenue ?? 0, 0, ',', '.') }}</div>
            <div class="stat-label">Pendapatan Hari Ini</div>
        </div>
    </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div class="card">
        <div class="card-header">
            <span><i class="bi bi-exclamation-triangle"></i> Stok Menipis</span>
        </div>
        <div class="card-body" style="padding:0">
            @if(count($lowStock) > 0)
            <table class="data-table">
                <thead>
                    <tr><th>Produk</th><th>SKU</th><th>Stok</th></tr>
                </thead>
                <tbody>
                    @foreach($lowStock as $item)
                    <tr>
                        <td>{{ $item->name }}</td>
                        <td>{{ $item->sku }}</td>
                        <td><span class="badge badge-warning">{{ $item->stock }}</span></td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <div class="empty-state"><i class="bi bi-check-circle"></i>Semua stok aman</div>
            @endif
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <span><i class="bi bi-fire"></i> Produk Terlaris Hari Ini</span>
        </div>
        <div class="card-body" style="padding:0">
            @if(count($topProducts) > 0)
            <table class="data-table">
                <thead>
                    <tr><th>Produk</th><th>Terjual</th><th>Pendapatan</th></tr>
                </thead>
                <tbody>
                    @foreach($topProducts as $item)
                    <tr>
                        <td>{{ $item->product_name }}</td>
                        <td>{{ $item->total_sold }} pcs</td>
                        <td>Rp {{ number_format($item->total_revenue, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <div class="empty-state"><i class="bi bi-cart"></i>Belum ada penjualan hari ini</div>
            @endif
        </div>
    </div>
</div>

<div class="card" style="margin-top:20px">
    <div class="card-header">
        <span><i class="bi bi-clock-history"></i> Transaksi Terbaru</span>
        <a href="{{ route('transactions.index') }}" class="btn btn-sm btn-outline">Lihat Semua</a>
    </div>
    <div class="card-body" style="padding:0">
        @if(count($recentTransactions) > 0)
        <table class="data-table">
            <thead>
                <tr>
                    <th>Invoice</th>
                    <th>Kasir</th>
                    <th>Total</th>
                    <th>Metode</th>
                    <th>Waktu</th>
                </tr>
            </thead>
            <tbody>
                @foreach($recentTransactions as $tx)
                <tr>
                    <td><a href="{{ route('transactions.show', $tx->id) }}" style="color:var(--primary)">{{ $tx->invoice_number }}</a></td>
                    <td>{{ $tx->cashier_name ?? '-' }}</td>
                    <td>Rp {{ number_format($tx->total, 0, ',', '.') }}</td>
                    <td><span class="badge badge-info">{{ strtoupper($tx->payment_method) }}</span></td>
                    <td>{{ \Carbon\Carbon::parse($tx->created_at)->format('d/m/Y H:i') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <div class="empty-state"><i class="bi bi-receipt"></i>Belum ada transaksi</div>
        @endif
    </div>
</div>
@endsection
