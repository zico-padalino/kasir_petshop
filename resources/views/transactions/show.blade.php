@extends('layouts.app')
@section('title', 'Detail Transaksi')
@section('page-title', 'Detail Transaksi')

@section('content')
<div style="display:flex;gap:10px;margin-bottom:20px">
    <a href="{{ route('transactions.index') }}" class="btn btn-outline btn-sm"><i class="bi bi-arrow-left"></i> Kembali</a>
    <a href="{{ route('transactions.receipt', $transaction->id) }}" class="btn btn-primary btn-sm" target="_blank">
        <i class="bi bi-printer"></i> Cetak Struk
    </a>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div class="card">
        <div class="card-header">Informasi Transaksi</div>
        <div class="card-body">
            <table style="width:100%;font-size:14px">
                <tr><td style="padding:6px 0;color:#666">Invoice</td><td><strong>{{ $transaction->invoice_number }}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#666">Kasir</td><td>{{ $transaction->cashier_name ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Pelanggan</td><td>{{ $transaction->customer_name ?? '-' }}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Metode Bayar</td><td><span class="badge badge-info">{{ strtoupper($transaction->payment_method) }}</span></td></tr>
                <tr><td style="padding:6px 0;color:#666">Waktu</td><td>{{ \Carbon\Carbon::parse($transaction->created_at)->format('d F Y, H:i') }}</td></tr>
                @if($transaction->notes)
                <tr><td style="padding:6px 0;color:#666">Catatan</td><td>{{ $transaction->notes }}</td></tr>
                @endif
            </table>
        </div>
    </div>

    <div class="card">
        <div class="card-header">Ringkasan Pembayaran</div>
        <div class="card-body">
            <table style="width:100%;font-size:14px">
                <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="text-align:right">Rp {{ number_format($transaction->subtotal, 0, ',', '.') }}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Diskon</td><td style="text-align:right">Rp {{ number_format($transaction->discount, 0, ',', '.') }}</td></tr>
                <tr style="font-size:18px;font-weight:700;border-top:2px solid #eee">
                    <td style="padding:10px 0">Total</td>
                    <td style="text-align:right;color:var(--primary)">Rp {{ number_format($transaction->total, 0, ',', '.') }}</td>
                </tr>
                @if($transaction->payment_method === 'cash')
                <tr><td style="padding:6px 0;color:#666">Uang Diterima</td><td style="text-align:right">Rp {{ number_format($transaction->cash_received, 0, ',', '.') }}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Kembalian</td><td style="text-align:right">Rp {{ number_format($transaction->change_amount, 0, ',', '.') }}</td></tr>
                @endif
            </table>
        </div>
    </div>
</div>

<div class="card" style="margin-top:20px">
    <div class="card-header">Item Transaksi</div>
    <div class="card-body" style="padding:0">
        <table class="data-table">
            <thead>
                <tr><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                <tr>
                    <td>{{ $item->product_name }}</td>
                    <td>Rp {{ number_format($item->price, 0, ',', '.') }}</td>
                    <td>{{ $item->qty }}</td>
                    <td>Rp {{ number_format($item->subtotal, 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</div>
@endsection
