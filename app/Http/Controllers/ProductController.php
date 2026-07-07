<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $categoryId = $request->query('category');

        $query = "
            SELECT p.*, c.name AS category_name
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE 1=1
        ";
        $params = [];

        if ($search) {
            $query .= ' AND (p.name LIKE ? OR p.sku LIKE ?)';
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        if ($categoryId) {
            $query .= ' AND p.category_id = ?';
            $params[] = $categoryId;
        }

        $query .= ' ORDER BY p.name';

        $products = DB::select($query, $params);
        $categories = DB::select('SELECT id, name FROM categories ORDER BY name');

        return view('products.index', compact('products', 'categories', 'search', 'categoryId'));
    }

    public function create()
    {
        $categories = DB::select('SELECT id, name FROM categories ORDER BY name');

        return view('products.create', compact('categories'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id' => 'required|integer',
            'sku' => 'required|string|max:50|unique:products,sku',
            'name' => 'required|string|max:200',
            'description' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        DB::insert("
            INSERT INTO products (category_id, sku, name, description, price, stock, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ", [
            $data['category_id'],
            strtoupper($data['sku']),
            $data['name'],
            $data['description'] ?? null,
            $data['price'],
            $data['stock'],
            $request->boolean('is_active', true) ? 1 : 0,
        ]);

        return redirect()->route('products.index')->with('success', 'Produk berhasil ditambahkan.');
    }

    public function edit(int $id)
    {
        $product = DB::selectOne('SELECT * FROM products WHERE id = ?', [$id]);

        if (! $product) {
            return redirect()->route('products.index')->with('error', 'Produk tidak ditemukan.');
        }

        $categories = DB::select('SELECT id, name FROM categories ORDER BY name');

        return view('products.edit', compact('product', 'categories'));
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'category_id' => 'required|integer',
            'sku' => 'required|string|max:50',
            'name' => 'required|string|max:200',
            'description' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $exists = DB::selectOne(
            'SELECT id FROM products WHERE sku = ? AND id != ?',
            [strtoupper($data['sku']), $id]
        );

        if ($exists) {
            return back()->with('error', 'SKU sudah digunakan produk lain.')->withInput();
        }

        DB::update("
            UPDATE products
            SET category_id = ?, sku = ?, name = ?, description = ?, price = ?, stock = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        ", [
            $data['category_id'],
            strtoupper($data['sku']),
            $data['name'],
            $data['description'] ?? null,
            $data['price'],
            $data['stock'],
            $request->boolean('is_active', true) ? 1 : 0,
            $id,
        ]);

        return redirect()->route('products.index')->with('success', 'Produk berhasil diperbarui.');
    }

    public function addStock(Request $request, int $id)
    {
        $data = $request->validate([
            'add_stock' => 'required|integer|min:1',
        ]);

        $updated = DB::update(
            'UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?',
            [$data['add_stock'], $id]
        );

        if (! $updated) {
            return back()->with('error', 'Produk tidak ditemukan.');
        }

        return back()->with('success', "Stok bertambah {$data['add_stock']} unit.");
    }

    public function destroy(int $id)
    {
        $inTransaction = DB::selectOne(
            'SELECT COUNT(*) AS total FROM transaction_items WHERE product_id = ?',
            [$id]
        );

        if ($inTransaction && $inTransaction->total > 0) {
            DB::update(
                'UPDATE products SET is_active = 0, updated_at = NOW() WHERE id = ?',
                [$id]
            );

            return back()->with('success', 'Produk dinonaktifkan karena sudah pernah ditransaksikan.');
        }

        DB::delete('DELETE FROM products WHERE id = ?', [$id]);

        return back()->with('success', 'Produk berhasil dihapus.');
    }
}
