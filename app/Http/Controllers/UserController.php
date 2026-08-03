<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = DB::select("
            SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.created_at, r.name AS role_name, r.slug AS role_slug
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            ORDER BY u.name
        ");

        $roles = DB::select('SELECT id, name, slug, description FROM roles ORDER BY id');
        $isAdmin = (auth()->user()->role_slug ?? '') === 'admin';
        if ($isAdmin) {
            $roles = array_values(array_filter($roles, fn ($r) => $r->slug !== 'owner'));
        }

        return view('users.index', compact('users', 'roles', 'isAdmin'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role_id' => 'required|integer',
        ]);

        if ($msg = $this->denyAdminOwnerAction((int) $data['role_id'])) {
            return back()->with('error', $msg)->withInput();
        }

        DB::insert("
            INSERT INTO users (name, email, password, role_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, NOW(), NOW())
        ", [
            $data['name'],
            $data['email'],
            Hash::make($data['password']),
            $data['role_id'],
        ]);

        return back()->with('success', 'Pengguna berhasil ditambahkan.');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'password' => 'nullable|string|min:6',
            'role_id' => 'required|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $target = DB::selectOne("
            SELECT u.id, r.slug AS role_slug
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            WHERE u.id = ?
        ", [$id]);

        if (! $target) {
            return back()->with('error', 'Pengguna tidak ditemukan.');
        }

        if ($this->isAdmin() && $target->role_slug === 'owner') {
            return back()->with('error', 'Admin tidak dapat mengubah akun Owner.');
        }

        if ($msg = $this->denyAdminOwnerAction((int) $data['role_id'])) {
            return back()->with('error', $msg)->withInput();
        }

        $exists = DB::selectOne(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [$data['email'], $id]
        );

        if ($exists) {
            return back()->with('error', 'Email sudah digunakan.')->withInput();
        }

        if (! empty($data['password'])) {
            DB::update("
                UPDATE users SET name = ?, email = ?, password = ?, role_id = ?, is_active = ?, updated_at = NOW()
                WHERE id = ?
            ", [
                $data['name'],
                $data['email'],
                Hash::make($data['password']),
                $data['role_id'],
                $request->boolean('is_active', true) ? 1 : 0,
                $id,
            ]);
        } else {
            DB::update("
                UPDATE users SET name = ?, email = ?, role_id = ?, is_active = ?, updated_at = NOW()
                WHERE id = ?
            ", [
                $data['name'],
                $data['email'],
                $data['role_id'],
                $request->boolean('is_active', true) ? 1 : 0,
                $id,
            ]);
        }

        return back()->with('success', 'Pengguna berhasil diperbarui.');
    }

    public function destroy(int $id)
    {
        if ($id === auth()->id()) {
            return back()->with('error', 'Tidak bisa menghapus akun sendiri.');
        }

        $target = DB::selectOne("
            SELECT u.id, r.slug AS role_slug
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            WHERE u.id = ?
        ", [$id]);

        if (! $target) {
            return back()->with('error', 'Pengguna tidak ditemukan.');
        }

        if ($this->isAdmin() && $target->role_slug === 'owner') {
            return back()->with('error', 'Admin tidak dapat menghapus akun Owner.');
        }

        DB::delete('DELETE FROM users WHERE id = ?', [$id]);

        return back()->with('success', 'Pengguna berhasil dihapus.');
    }

    private function isAdmin(): bool
    {
        return (auth()->user()->role_slug ?? '') === 'admin';
    }

    private function denyAdminOwnerAction(int $roleId): ?string
    {
        if (! $this->isAdmin()) {
            return null;
        }

        $role = DB::selectOne('SELECT slug FROM roles WHERE id = ?', [$roleId]);
        if ($role && $role->slug === 'owner') {
            return 'Admin tidak dapat menambah / menetapkan role Owner.';
        }

        return null;
    }
}
