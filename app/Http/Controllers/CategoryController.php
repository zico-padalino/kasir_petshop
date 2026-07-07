<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = DB::select("
            SELECT c.*, COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        ");

        return view('categories.index', compact('categories'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
        ]);

        DB::insert("
            INSERT INTO categories (name, description, created_at, updated_at)
            VALUES (?, ?, NOW(), NOW())
        ", [$data['name'], $data['description'] ?? null]);

        return back()->with('success', 'Kategori berhasil ditambahkan.');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
        ]);

        $updated = DB::update("
            UPDATE categories SET name = ?, description = ?, updated_at = NOW()
            WHERE id = ?
        ", [$data['name'], $data['description'] ?? null, $id]);

        if (! $updated) {
            return back()->with('error', 'Kategori tidak ditemukan.');
        }

        return back()->with('success', 'Kategori berhasil diperbarui.');
    }

    public function destroy(int $id)
    {
        $hasProducts = DB::selectOne(
            'SELECT COUNT(*) AS total FROM products WHERE category_id = ?',
            [$id]
        );

        if ($hasProducts && $hasProducts->total > 0) {
            return back()->with('error', 'Kategori masih memiliki produk, tidak bisa dihapus.');
        }

        DB::delete('DELETE FROM categories WHERE id = ?', [$id]);

        return back()->with('success', 'Kategori berhasil dihapus.');
    }
}
