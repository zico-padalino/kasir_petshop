@extends('layouts.app')
@section('title', 'Tambah Produk')
@section('page-title', 'Tambah Produk Baru')

@section('content')
<div class="card" style="max-width:640px">
    <div class="card-body">
        <form method="POST" action="{{ route('products.store') }}">
            @csrf
            <div class="form-group">
                <label class="form-label">Kategori *</label>
                <select name="category_id" class="form-control" required>
                    <option value="">Pilih Kategori</option>
                    @foreach($categories as $cat)
                    <option value="{{ $cat->id }}" {{ old('category_id') == $cat->id ? 'selected' : '' }}>{{ $cat->name }}</option>
                    @endforeach
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">SKU</label>
                <input type="text" class="form-control" value="Otomatis sesuai kategori (contoh: MK-006)" disabled style="background:#f8f9fa;font-weight:600">
                <small style="color:#888;font-size:12px">SKU dibuat otomatis saat produk disimpan.</small>
            </div>
            <div class="form-group">
                <label class="form-label">Harga *</label>
                <div class="rupiah-field">
                    <span class="rupiah-field-prefix">Rp</span>
                    <input type="text" class="form-control rupiah-field-input" data-rupiah-for="price" value="{{ old('price') !== null ? number_format((int) old('price', 0), 0, ',', '.') : '' }}" inputmode="numeric" autocomplete="off" required>
                </div>
                <input type="hidden" name="price" id="price" value="{{ old('price', 0) }}">
            </div>
            <div class="form-group">
                <label class="form-label">Nama Produk *</label>
                <input type="text" name="name" class="form-control" value="{{ old('name') }}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Deskripsi</label>
                <textarea name="description" class="form-control" rows="3">{{ old('description') }}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Stok *</label>
                    <input type="number" name="stock" class="form-control" value="{{ old('stock', 0) }}" min="0" required>
                </div>
                <div class="form-group" style="display:flex;align-items:center;gap:8px;padding-top:28px">
                    <input type="checkbox" name="is_active" value="1" id="is_active" checked>
                    <label for="is_active" style="margin:0">Produk Aktif</label>
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:8px">
                <a href="{{ route('products.index') }}" class="btn btn-outline">Batal</a>
                <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> Simpan</button>
            </div>
        </form>
    </div>
</div>
@endsection
