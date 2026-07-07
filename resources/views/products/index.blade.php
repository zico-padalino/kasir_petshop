@extends('layouts.app')
@section('title', 'Produk')
@section('page-title', 'Daftar Produk')

@section('content')
<div class="card">
    <div class="card-header">
        <span>Semua Produk</span>
        <div style="display:flex;gap:10px">
            @if(auth()->user()->isAdmin())
            <a href="{{ route('products.create') }}" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> Tambah Produk</a>
            @endif
        </div>
    </div>
    <div class="card-body">
        <form method="GET" class="search-bar">
            <input type="text" name="search" class="form-control" placeholder="Cari nama atau SKU..." value="{{ $search }}">
            <select name="category" class="form-control" style="max-width:200px">
                <option value="">Semua Kategori</option>
                @foreach($categories as $cat)
                <option value="{{ $cat->id }}" {{ $categoryId == $cat->id ? 'selected' : '' }}>{{ $cat->name }}</option>
                @endforeach
            </select>
            <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-search"></i> Filter</button>
        </form>

        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Nama Produk</th>
                        <th>Kategori</th>
                        <th>Harga</th>
                        <th>Stok</th>
                        <th>Status</th>
                        @if(auth()->user()->isAdmin())<th>Aksi</th>@endif
                    </tr>
                </thead>
                <tbody>
                    @forelse($products as $product)
                    <tr>
                        <td><code>{{ $product->sku }}</code></td>
                        <td>{{ $product->name }}</td>
                        <td>{{ $product->category_name }}</td>
                        <td>Rp {{ number_format($product->price, 0, ',', '.') }}</td>
                        <td>
                            @if($product->stock <= 10)
                            <span class="badge badge-warning">{{ $product->stock }}</span>
                            @else
                            {{ $product->stock }}
                            @endif
                        </td>
                        <td>
                            @if($product->is_active)
                            <span class="badge badge-success">Aktif</span>
                            @else
                            <span class="badge badge-danger">Nonaktif</span>
                            @endif
                        </td>
                        @if(auth()->user()->isAdmin())
                        <td style="white-space:nowrap">
                            <form action="{{ route('products.addStock', $product->id) }}" method="POST" style="display:inline-flex;gap:4px;align-items:center">
                                @csrf @method('PATCH')
                                <input type="number" name="add_stock" min="1" value="10" style="width:55px;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:12px">
                                <button class="btn btn-sm btn-success" title="Tambah Stok"><i class="bi bi-plus-lg"></i></button>
                            </form>
                            <a href="{{ route('products.edit', $product->id) }}" class="btn btn-sm btn-outline"><i class="bi bi-pencil"></i></a>
                            <form action="{{ route('products.destroy', $product->id) }}" method="POST" style="display:inline" onsubmit="return confirm('Hapus produk ini?')">
                                @csrf @method('DELETE')
                                <button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                            </form>
                        </td>
                        @endif
                    </tr>
                    @empty
                    <tr><td colspan="7" class="empty-state">Belum ada produk</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
