<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Struk {{ $transaction->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 16px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .right { text-align: right; }
        @media print {
            body { width: 100%; padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="center bold" style="font-size:16px">🐾 PetShop Dzikra</div>
    <div class="center" style="font-size:11px;margin:4px 0">Jl. Pet Shop No. 1, Indonesia</div>
    <div class="center" style="font-size:11px">Telp: 0812-3456-7890</div>
    <div class="line"></div>

    <table>
        <tr><td>No. Invoice</td><td class="right">{{ $transaction->invoice_number }}</td></tr>
        <tr><td>Tanggal</td><td class="right">{{ \Carbon\Carbon::parse($transaction->created_at)->format('d/m/Y H:i') }}</td></tr>
        <tr><td>Kasir</td><td class="right">{{ $transaction->cashier_name ?? '-' }}</td></tr>
        @if($transaction->customer_name)
        <tr><td>Pelanggan</td><td class="right">{{ $transaction->customer_name }}</td></tr>
        @endif
    </table>

    <div class="line"></div>

    <table>
        @foreach($items as $item)
        <tr>
            <td colspan="2">{{ $item->product_name }}</td>
        </tr>
        <tr>
            <td>&nbsp;&nbsp;{{ $item->qty }} x Rp {{ number_format($item->price, 0, ',', '.') }}</td>
            <td class="right">Rp {{ number_format($item->subtotal, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </table>

    <div class="line"></div>

    <table>
        <tr><td>Subtotal</td><td class="right">Rp {{ number_format($transaction->subtotal, 0, ',', '.') }}</td></tr>
        @if($transaction->discount > 0)
        <tr><td>Diskon</td><td class="right">- Rp {{ number_format($transaction->discount, 0, ',', '.') }}</td></tr>
        @endif
        <tr class="bold"><td>TOTAL</td><td class="right">Rp {{ number_format($transaction->total, 0, ',', '.') }}</td></tr>
        <tr><td>Bayar ({{ strtoupper($transaction->payment_method) }})</td>
            <td class="right">
                @if($transaction->payment_method === 'cash')
                Rp {{ number_format($transaction->cash_received, 0, ',', '.') }}
                @else
                Rp {{ number_format($transaction->total, 0, ',', '.') }}
                @endif
            </td>
        </tr>
        @if($transaction->payment_method === 'cash' && $transaction->change_amount > 0)
        <tr><td>Kembalian</td><td class="right">Rp {{ number_format($transaction->change_amount, 0, ',', '.') }}</td></tr>
        @endif
    </table>

    <div class="line"></div>
    <div class="center" style="margin-top:8px">Terima kasih atas kunjungan Anda!</div>
    <div class="center" style="font-size:10px;margin-top:4px">Barang yang sudah dibeli tidak dapat ditukar</div>

    <div class="no-print center" style="margin-top:20px">
        <button onclick="window.print()" style="padding:8px 24px;cursor:pointer;font-size:14px">🖨️ Cetak Struk</button>
        <br><br>
        <a href="{{ route('pos.index') }}" style="font-size:12px">← Kembali ke Kasir</a>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>
