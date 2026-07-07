@extends('layouts.app')
@section('title', 'Pengguna')
@section('page-title', 'Pengguna & Role Akses')

@section('content')
<div style="display:grid;grid-template-columns:1fr 380px;gap:20px">
    <div class="card">
        <div class="card-header"><span>Daftar Pengguna</span></div>
        <div class="card-body" style="padding:0">
            <table class="data-table">
                <thead>
                    <tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                    @foreach($users as $u)
                    <tr>
                        <td><strong>{{ $u->name }}</strong></td>
                        <td>{{ $u->email }}</td>
                        <td>
                            @if($u->role_slug === 'admin')
                            <span class="badge badge-danger">{{ $u->role_name }}</span>
                            @elseif($u->role_slug === 'kasir')
                            <span class="badge badge-info">{{ $u->role_name }}</span>
                            @else
                            <span class="badge badge-warning">{{ $u->role_name }}</span>
                            @endif
                        </td>
                        <td>
                            @if($u->is_active)
                            <span class="badge badge-success">Aktif</span>
                            @else
                            <span class="badge badge-danger">Nonaktif</span>
                            @endif
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline" onclick="editUser({{ json_encode($u) }})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            @if($u->id !== auth()->id())
                            <form action="{{ route('users.destroy', $u->id) }}" method="POST" style="display:inline" onsubmit="return confirm('Hapus pengguna?')">
                                @csrf @method('DELETE')
                                <button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
                            </form>
                            @endif
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>

    <div>
        <div class="card">
            <div class="card-header"><span id="userFormTitle">Tambah Pengguna</span></div>
            <div class="card-body">
                <form method="POST" action="{{ route('users.store') }}" id="userForm">
                    @csrf
                    <input type="hidden" id="userMethod" name="_method" value="" disabled>
                    <div class="form-group">
                        <label class="form-label">Nama *</label>
                        <input type="text" name="name" id="userName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" name="email" id="userEmail" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password <span id="passHint">*</span></label>
                        <input type="password" name="password" id="userPassword" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role *</label>
                        <select name="role_id" id="userRole" class="form-control" required>
                            @foreach($roles as $role)
                            <option value="{{ $role->id }}">{{ $role->name }} — {{ $role->description }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="form-group" id="activeGroup" style="display:flex;align-items:center;gap:8px" hidden>
                        <input type="checkbox" name="is_active" value="1" id="userActive" checked>
                        <label for="userActive" style="margin:0">Akun Aktif</label>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">
                        <i class="bi bi-check-lg"></i> <span id="userSubmitText">Simpan</span>
                    </button>
                    <button type="button" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px" id="cancelUserEdit" onclick="resetUserForm()" hidden>Batal Edit</button>
                </form>
            </div>
        </div>

        <div class="card" style="margin-top:16px">
            <div class="card-header">Hak Akses Role</div>
            <div class="card-body" style="font-size:13px">
                <p><span class="badge badge-danger">Admin</span> Akses penuh: POS, produk, kategori, pengguna</p>
                <p><span class="badge badge-info">Kasir</span> POS dan riwayat transaksi sendiri</p>
                <p><span class="badge badge-warning">Owner</span> Dashboard, POS, lihat produk & semua transaksi</p>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function editUser(u) {
    document.getElementById('userForm').action = '/users/' + u.id;
    document.getElementById('userMethod').disabled = false;
    document.getElementById('userMethod').value = 'PUT';
    document.getElementById('userName').value = u.name;
    document.getElementById('userEmail').value = u.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('passHint').textContent = '(kosongkan jika tidak diubah)';
    document.getElementById('userRole').value = u.role_id;
    document.getElementById('userActive').checked = u.is_active == 1;
    document.getElementById('activeGroup').hidden = false;
    document.getElementById('userFormTitle').textContent = 'Edit Pengguna';
    document.getElementById('userSubmitText').textContent = 'Update';
    document.getElementById('cancelUserEdit').hidden = false;
}

function resetUserForm() {
    document.getElementById('userForm').action = '{{ route("users.store") }}';
    document.getElementById('userMethod').disabled = true;
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('passHint').textContent = '*';
    document.getElementById('activeGroup').hidden = true;
    document.getElementById('userFormTitle').textContent = 'Tambah Pengguna';
    document.getElementById('userSubmitText').textContent = 'Simpan';
    document.getElementById('cancelUserEdit').hidden = true;
}
</script>
@endpush
