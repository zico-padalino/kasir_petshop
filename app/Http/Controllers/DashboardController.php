<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $today = date('Y-m-d');

        $stats = DB::selectOne("
            SELECT
                (SELECT COUNT(*) FROM products WHERE is_active = 1) AS total_products,
                (SELECT COALESCE(SUM(stock), 0) FROM products WHERE is_active = 1) AS total_stock,
                (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = ?) AS today_transactions,
                (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE DATE(created_at) = ?) AS today_revenue
        ", [$today, $today]);

        $lowStock = DB::select("
            SELECT p.name, p.sku, p.stock, c.name AS category_name
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.is_active = 1 AND p.stock <= 10
            ORDER BY p.stock ASC
            LIMIT 5
        ");

        $recentTransactions = DB::select("
            SELECT t.id, t.invoice_number, t.total, t.payment_method, t.created_at, u.name AS cashier_name
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            ORDER BY t.created_at DESC
            LIMIT 5
        ");

        $topProducts = DB::select("
            SELECT ti.product_name, SUM(ti.qty) AS total_sold, SUM(ti.subtotal) AS total_revenue
            FROM transaction_items ti
            JOIN transactions t ON t.id = ti.transaction_id
            WHERE DATE(t.created_at) = ?
            GROUP BY ti.product_name
            ORDER BY total_sold DESC
            LIMIT 5
        ", [$today]);

        return view('dashboard.index', compact('stats', 'lowStock', 'recentTransactions', 'topProducts'));
    }
}
