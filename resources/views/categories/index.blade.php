@extends('layouts.app')
@section('title', 'Kategori')
@section('page-title', 'Kategori Produk')

@section('content')
<div style="display:grid;grid-template-columns:1fr 360px;gap:20px">
    <div class="card">
        <div class="card-header"><span>Daftar Kategori</span></div>
        <div class="card-body" style="padding:0">
            <table class="data-table">
                <thead>
                    <tr><th>Nama</th><th>Deskripsi</th><th>Produk</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                    @forelse($categories as $cat)
                    <tr>
                        <td><strong>{{ $cat->name }}</strong></td>
                        <td>{{ $cat->description ?? '-' }}</td>
                        <td><span class="badge badge-info">{{ $cat->product_count }} produk</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline" onclick="editCategory({{ $cat->id }}, '{{ addslashes($cat->name) }}', '{{ addslashes($cat->description ?? '') }}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            @if($cat->product_count == 0)
                            <form action="{{ route('categories.destroy', $cat->id) }}" method="POST" style="display:inline" onsubmit="return confirm('Hapus kategori?')">
                                @csrf @method('DELETE')
                                <button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                            </form>
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="4" class="empty-state">Belum ada kategori</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><span id="formTitle">Tambah Kategori</span></div>
        <div class="card-body">
            <form method="POST" action="{{ route('categories.store') }}" id="categoryForm">
                @csrf
                <input type="hidden" id="formMethod" name="_method" value="" disabled>
                <div class="form-group">
                    <label class="form-label">Nama Kategori *</label>
                    <input type="text" name="name" id="catName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Deskripsi</label>
                    <textarea name="description" id="catDesc" class="form-control" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">
                    <i class="bi bi-check-lg"></i> <span id="submitText">Simpan</span>
                </button>
                <button type="button" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px" id="cancelEdit" onclick="resetForm()" hidden>Batal Edit</button>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function editCategory(id, name, desc) {
    document.getElementById('categoryForm').action = '/categories/' + id;
    document.getElementById('formMethod').disabled = false;
    document.getElementById('formMethod').value = 'PUT';
    document.getElementById('catName').value = name;
    document.getElementById('catDesc').value = desc;
    document.getElementById('formTitle').textContent = 'Edit Kategori';
    document.getElementById('submitText').textContent = 'Update';
    document.getElementById('cancelEdit').hidden = false;
}

function resetForm() {
    document.getElementById('categoryForm').action = '{{ route("categories.store") }}';
    document.getElementById('formMethod').disabled = true;
    document.getElementById('catName').value = '';
    document.getElementById('catDesc').value = '';
    document.getElementById('formTitle').textContent = 'Tambah Kategori';
    document.getElementById('submitText').textContent = 'Simpan';
    document.getElementById('cancelEdit').hidden = true;
}
</script>
@endpush
