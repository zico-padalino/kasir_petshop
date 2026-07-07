<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PosController extends Controller
{
    public function index(Request $request)
    {
        $categoryId = $request->query('category');
        $search = $request->query('search');

        $categories = DB::select('SELECT id, name FROM categories ORDER BY name');

        $query = "
            SELECT p.id, p.sku, p.name, p.price, p.stock, c.name AS category_name
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.is_active = 1 AND p.stock > 0
        ";
        $params = [];

        if ($categoryId) {
            $query .= ' AND p.category_id = ?';
            $params[] = $categoryId;
        }

        if ($search) {
            $query .= ' AND (p.name LIKE ? OR p.sku LIKE ?)';
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $query .= ' ORDER BY p.name';

        $products = DB::select($query, $params);

        return view('pos.index', compact('products', 'categories', 'categoryId', 'search'));
    }

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.qty' => 'required|integer|min:1',
            'discount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,transfer,qris',
            'cash_received' => 'nullable|numeric|min:0',
            'customer_name' => 'nullable|string|max:150',
            'notes' => 'nullable|string|max:500',
        ]);

        $discount = $data['discount'] ?? 0;
        $paymentMethod = $data['payment_method'];
        $cashReceived = $data['cash_received'] ?? null;

        DB::beginTransaction();

        try {
            $subtotal = 0;
            $cartItems = [];

            foreach ($data['items'] as $item) {
                $product = DB::selectOne(
                    'SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1',
                    [$item['product_id']]
                );

                if (! $product) {
                    throw new \Exception('Produk tidak ditemukan.');
                }

                if ($product->stock < $item['qty']) {
                    throw new \Exception("Stok {$product->name} tidak cukup (tersisa: {$product->stock}).");
                }

                $lineSubtotal = $product->price * $item['qty'];
                $subtotal += $lineSubtotal;

                $cartItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'qty' => $item['qty'],
                    'price' => $product->price,
                    'subtotal' => $lineSubtotal,
                ];
            }

            $total = max(0, $subtotal - $discount);
            $changeAmount = null;

            if ($paymentMethod === 'cash') {
                if ($cashReceived === null || $cashReceived < $total) {
                    throw new \Exception('Uang diterima harus lebih besar atau sama dengan total.');
                }
                $changeAmount = $cashReceived - $total;
            }

            $invoiceNumber = $this->generateInvoiceNumber();

            DB::insert("
                INSERT INTO transactions
                (invoice_number, user_id, subtotal, discount, total, payment_method, cash_received, change_amount, customer_name, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ", [
                $invoiceNumber,
                Auth::id(),
                $subtotal,
                $discount,
                $total,
                $paymentMethod,
                $cashReceived,
                $changeAmount,
                $data['customer_name'] ?? null,
                $data['notes'] ?? null,
            ]);

            $transactionId = DB::getPdo()->lastInsertId();

            foreach ($cartItems as $cartItem) {
                DB::insert("
                    INSERT INTO transaction_items
                    (transaction_id, product_id, product_name, qty, price, subtotal, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                ", [
                    $transactionId,
                    $cartItem['product_id'],
                    $cartItem['product_name'],
                    $cartItem['qty'],
                    $cartItem['price'],
                    $cartItem['subtotal'],
                ]);

                DB::update(
                    'UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
                    [$cartItem['qty'], $cartItem['product_id']]
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil!',
                'invoice_number' => $invoiceNumber,
                'total' => $total,
                'change_amount' => $changeAmount,
                'transaction_id' => $transactionId,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.date('Ymd').'-';
        $last = DB::selectOne(
            "SELECT invoice_number FROM transactions WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
            [$prefix.'%']
        );

        $sequence = 1;
        if ($last) {
            $sequence = (int) substr($last->invoice_number, -4) + 1;
        }

        return $prefix.str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }
}
