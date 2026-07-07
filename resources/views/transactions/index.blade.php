@extends('layouts.app')
@section('title', 'Riwayat Transaksi')
@section('page-title', 'Riwayat Transaksi')

@section('content')
<div class="stat-grid" style="grid-template-columns:1fr 1fr;max-width:500px">
    <div class="stat-card">
        <div class="stat-icon orange"><i class="bi bi-receipt"></i></div>
        <div class="stat-info">
            <div class="stat-value">{{ $summary->total_count ?? 0 }}</div>
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
</div>

<div class="card">
    <div class="card-header">
        <span>Daftar Transaksi</span>
    </div>
    <div class="card-body">
        <form method="GET" class="search-bar">
            <input type="date" name="date_from" class="form-control" value="{{ $dateFrom }}" style="max-width:160px">
            <span style="align-self:center;color:#666">s/d</span>
            <input type="date" name="date_to" class="form-control" value="{{ $dateTo }}" style="max-width:160px">
            <input type="text" name="search" class="form-control" placeholder="Cari invoice / pelanggan..." value="{{ $search }}" style="max-width:220px">
            <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-funnel"></i> Filter</button>
            <a href="{{ route('transactions.index') }}" class="btn btn-outline btn-sm">Reset</a>
        </form>

        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Kasir</th>
                        <th>Pelanggan</th>
                        <th>Total</th>
                        <th>Bayar</th>
                        <th>Waktu</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($transactions as $tx)
                    <tr>
                        <td><strong>{{ $tx->invoice_number }}</strong></td>
                        <td>{{ $tx->cashier_name ?? '-' }}</td>
                        <td>{{ $tx->customer_name ?? '-' }}</td>
                        <td>Rp {{ number_format($tx->total, 0, ',', '.') }}</td>
                        <td><span class="badge badge-info">{{ strtoupper($tx->payment_method) }}</span></td>
                        <td>{{ \Carbon\Carbon::parse($tx->created_at)->format('d/m/Y H:i') }}</td>
                        <td style="white-space:nowrap">
                            <a href="{{ route('transactions.show', $tx->id) }}" class="btn btn-sm btn-outline" title="Detail">
                                <i class="bi bi-eye"></i>
                            </a>
                            <a href="{{ route('transactions.receipt', $tx->id) }}" class="btn btn-sm btn-primary" target="_blank" title="Cetak Struk">
                                <i class="bi bi-printer"></i>
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="7" class="empty-state">Tidak ada transaksi pada periode ini</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
