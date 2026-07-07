@extends('layouts.app')
@section('title', 'Laporan Penjualan')
@section('page-title', 'Laporan Penjualan')

@section('content')
<div class="card" style="margin-bottom:20px">
    <div class="card-body">
        <form method="GET" class="search-bar">
            <label class="form-label" style="margin:0;align-self:center">Periode:</label>
            <input type="date" name="date_from" class="form-control" value="{{ $dateFrom }}" style="max-width:160px">
            <span style="align-self:center;color:#666">s/d</span>
            <input type="date" name="date_to" class="form-control" value="{{ $dateTo }}" style="max-width:160px">
            <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-funnel"></i> Tampilkan</button>
        </form>
    </div>
</div>

<div class="stat-grid">
    <div class="stat-card">
        <div class="stat-icon orange"><i class="bi bi-receipt"></i></div>
        <div class="stat-info">
            <div class="stat-value">{{ $summary->total_transactions ?? 0 }}</div>
            <div class="stat-label">Total Transaksi</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon teal"><i class="bi bi-currency-dollar"></i></div>
        <div class="stat-info">
            <div class="stat-value">Rp {{ number_format($summary->total_revenue ?? 0, 0, ',', '.') }}</div>
            <div class="stat-label">Total Pendapatan</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon green"><i class="bi bi-percent"></i></div>
        <div class="stat-info">
            <div class="stat-value">Rp {{ number_format($summary->total_discount ?? 0, 0, ',', '.') }}</div>
            <div class="stat-label">Total Diskon</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon blue"><i class="bi bi-graph-up"></i></div>
        <div class="stat-info">
            <div class="stat-value">Rp {{ number_format($summary->avg_transaction ?? 0, 0, ',', '.') }}</div>
            <div class="stat-label">Rata-rata Transaksi</div>
        </div>
    </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div class="card">
        <div class="card-header"><i class="bi bi-credit-card"></i> Pendapatan per Metode Bayar</div>
        <div class="card-body" style="padding:0">
            @if(count($byPayment) > 0)
            <table class="data-table">
                <thead><tr><th>Metode</th><th>Jumlah</th><th>Total</th></tr></thead>
                <tbody>
                    @foreach($byPayment as $row)
                    <tr>
                        <td><span class="badge badge-info">{{ strtoupper($row->payment_method) }}</span></td>
                        <td>{{ $row->total_count }}x</td>
                        <td>Rp {{ number_format($row->total_amount, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <div class="empty-state"><i class="bi bi-inbox"></i>Belum ada data</div>
            @endif
        </div>
    </div>

    <div class="card">
        <div class="card-header"><i class="bi bi-person"></i> Performa Kasir</div>
        <div class="card-body" style="padding:0">
            @if(count($byCashier) > 0)
            <table class="data-table">
                <thead><tr><th>Kasir</th><th>Transaksi</th><th>Total</th></tr></thead>
                <tbody>
                    @foreach($byCashier as $row)
                    <tr>
                        <td>{{ $row->cashier_name ?? 'Unknown' }}</td>
                        <td>{{ $row->total_count }}x</td>
                        <td>Rp {{ number_format($row->total_revenue, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <div class="empty-state"><i class="bi bi-inbox"></i>Belum ada data</div>
            @endif
        </div>
    </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
    <div class="card">
        <div class="card-header"><i class="bi bi-fire"></i> 10 Produk Terlaris</div>
        <div class="card-body" style="padding:0">
            @if(count($topProducts) > 0)
            <table class="data-table">
                <thead><tr><th>#</th><th>Produk</th><th>Terjual</th><th>Pendapatan</th></tr></thead>
                <tbody>
                    @foreach($topProducts as $i => $row)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $row->product_name }}</td>
                        <td>{{ $row->total_qty }} pcs</td>
                        <td>Rp {{ number_format($row->total_revenue, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <div class="empty-state"><i class="bi bi-cart"></i>Belum ada penjualan</div>
            @endif
        </div>
    </div>

    <div class="card">
        <div class="card-header"><i class="bi bi-calendar3"></i> Penjualan Harian</div>
        <div class="card-body" style="padding:0">
            @if(count($dailySales) > 0)
            <table class="data-table">
                <thead><tr><th>Tanggal</th><th>Transaksi</th><th>Pendapatan</th></tr></thead>
                <tbody>
                    @foreach($dailySales as $row)
                    <tr>
                        <td>{{ \Carbon\Carbon::parse($row->sale_date)->format('d/m/Y') }}</td>
                        <td>{{ $row->total_count }}x</td>
                        <td>Rp {{ number_format($row->total_revenue, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <div class="empty-state"><i class="bi bi-calendar"></i>Belum ada data</div>
            @endif
        </div>
    </div>
</div>
@endsection
