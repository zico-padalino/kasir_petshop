@extends('layouts.app')
@section('title', 'Uang Kasir')
@section('page-title', 'Uang Kasir')

@section('content')
<div class="cash-balance-card">
    <div class="cash-balance-label">Saldo uang kasir saat ini</div>
    <div class="cash-balance-value">Rp {{ number_format($drawer->balance ?? 0, 0, ',', '.') }}</div>
    @if(!empty($drawer->updated_at))
    <div class="cash-balance-meta">Terakhir update: {{ \Carbon\Carbon::parse($drawer->updated_at)->format('d/m/Y H:i') }}</div>
    @endif
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    <div class="card" style="margin:0"><div class="card-body" style="padding:14px">
        <div style="font-weight:700">Rp {{ number_format($todayStats->cash_in ?? 0, 0, ',', '.') }}</div>
        <div style="font-size:12px;color:#888">Setor hari ini</div>
    </div></div>
    <div class="card" style="margin:0"><div class="card-body" style="padding:14px">
        <div style="font-weight:700">Rp {{ number_format($todayStats->cash_out ?? 0, 0, ',', '.') }}</div>
        <div style="font-size:12px;color:#888">Tarik hari ini</div>
    </div></div>
    <div class="card" style="margin:0"><div class="card-body" style="padding:14px">
        <div style="font-weight:700">Rp {{ number_format($todayStats->sales ?? 0, 0, ',', '.') }}</div>
        <div style="font-size:12px;color:#888">Penjualan tunai</div>
    </div></div>
    <div class="card" style="margin:0"><div class="card-body" style="padding:14px">
        <div style="font-weight:700">Rp {{ number_format($todayStats->hotel ?? 0, 0, ',', '.') }}</div>
        <div style="font-size:12px;color:#888">Titip tunai</div>
    </div></div>
</div>

<div style="display:grid;grid-template-columns:360px 1fr;gap:20px">
    <div class="card">
        <div class="card-header"><span>Setor / Tarik Uang</span></div>
        <div class="card-body">
            <form method="POST" action="{{ route('cash-drawer.store') }}" id="cashForm">
                @csrf
                <input type="hidden" name="mode" id="cashMode" value="in">
                <div class="discount-type-tabs" style="margin-bottom:12px">
                    <button type="button" class="discount-type-tab active" id="modeIn" onclick="setCashMode('in')">Masukkan</button>
                    <button type="button" class="discount-type-tab" id="modeOut" onclick="setCashMode('out')">Keluarkan</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Nominal *</label>
                    <div class="rupiah-field">
                        <span class="rupiah-field-prefix">Rp</span>
                        <input type="text" class="form-control rupiah-field-input" data-rupiah-for="amount" value="{{ old('amount') ? number_format((int) old('amount'), 0, ',', '.') : '' }}" inputmode="numeric" autocomplete="off" required>
                    </div>
                    <input type="hidden" name="amount" id="amount" value="{{ old('amount', 0) }}">
                </div>
                <div class="form-group">
                    <label class="form-label">Keterangan</label>
                    <input type="text" name="note" class="form-control" value="{{ old('note') }}" placeholder="Contoh: Modal pagi / setor bank">
                </div>
                <button type="submit" class="btn btn-success" id="cashSubmit" style="width:100%;justify-content:center">
                    <i class="bi bi-box-arrow-in-down"></i> Masukkan ke Kasir
                </button>
            </form>
            <p style="font-size:12px;color:#888;margin-top:12px;margin-bottom:0">
                Pembayaran <strong>Tunai</strong> di kasir otomatis menambah saldo (nilai total penjualan).
            </p>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><span>Riwayat Uang Kasir</span></div>
        <div class="card-body" style="padding:0">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Waktu</th>
                            <th>Jenis</th>
                            <th>Nominal</th>
                            <th>Saldo</th>
                            <th>Keterangan</th>
                            <th>Oleh</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($movements as $m)
                        @php
                            $labels = [
                                'cash_in' => ['Setor Masuk', 'badge-success', '+'],
                                'cash_out' => ['Tarik Keluar', 'badge-danger', '−'],
                                'sale_cash' => ['Penjualan Tunai', 'badge-info', '+'],
                                'hotel_cash' => ['Titip Hewan Tunai', 'badge-warning', '+'],
                            ];
                            [$label, $badge, $sign] = $labels[$m->type] ?? [$m->type, 'badge-info', '+'];
                        @endphp
                        <tr>
                            <td style="white-space:nowrap;font-size:12px">{{ \Carbon\Carbon::parse($m->created_at)->format('d/m/Y H:i') }}</td>
                            <td><span class="badge {{ $badge }}">{{ $label }}</span></td>
                            <td style="font-weight:700;white-space:nowrap;color:{{ $m->direction === 'out' ? '#dc3545' : '#28a745' }}">
                                {{ $sign }} Rp {{ number_format($m->amount, 0, ',', '.') }}
                            </td>
                            <td style="white-space:nowrap">Rp {{ number_format($m->balance_after, 0, ',', '.') }}</td>
                            <td style="font-size:13px">
                                {{ $m->note ?: '-' }}
                                @if($m->reference)<div style="color:#888;font-size:11px">{{ $m->reference }}</div>@endif
                            </td>
                            <td style="font-size:13px">{{ $m->user_name ?: '-' }}</td>
                        </tr>
                        @empty
                        <tr><td colspan="6" style="text-align:center;color:#888">Belum ada pergerakan uang</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function setCashMode(mode) {
    document.getElementById('cashMode').value = mode;
    document.getElementById('modeIn').classList.toggle('active', mode === 'in');
    document.getElementById('modeOut').classList.toggle('active', mode === 'out');
    const btn = document.getElementById('cashSubmit');
    if (mode === 'in') {
        btn.className = 'btn btn-success';
        btn.style.width = '100%';
        btn.style.justifyContent = 'center';
        btn.innerHTML = '<i class="bi bi-box-arrow-in-down"></i> Masukkan ke Kasir';
    } else {
        btn.className = 'btn btn-danger';
        btn.style.width = '100%';
        btn.style.justifyContent = 'center';
        btn.innerHTML = '<i class="bi bi-box-arrow-up"></i> Keluarkan dari Kasir';
    }
}
</script>
@endpush
