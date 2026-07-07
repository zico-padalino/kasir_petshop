<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $dateFrom = $request->query('date_from', date('Y-m-01'));
        $dateTo = $request->query('date_to', date('Y-m-d'));

        $summary = DB::selectOne("
            SELECT
                COUNT(*) AS total_transactions,
                COALESCE(SUM(total), 0) AS total_revenue,
                COALESCE(SUM(discount), 0) AS total_discount,
                COALESCE(AVG(total), 0) AS avg_transaction
            FROM transactions
            WHERE DATE(created_at) BETWEEN ? AND ?
        ", [$dateFrom, $dateTo]);

        $byPayment = DB::select("
            SELECT payment_method, COUNT(*) AS total_count, COALESCE(SUM(total), 0) AS total_amount
            FROM transactions
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY payment_method
            ORDER BY total_amount DESC
        ", [$dateFrom, $dateTo]);

        $topProducts = DB::select("
            SELECT ti.product_name, SUM(ti.qty) AS total_qty, COALESCE(SUM(ti.subtotal), 0) AS total_revenue
            FROM transaction_items ti
            JOIN transactions t ON t.id = ti.transaction_id
            WHERE DATE(t.created_at) BETWEEN ? AND ?
            GROUP BY ti.product_name
            ORDER BY total_qty DESC
            LIMIT 10
        ", [$dateFrom, $dateTo]);

        $dailySales = DB::select("
            SELECT DATE(created_at) AS sale_date, COUNT(*) AS total_count, COALESCE(SUM(total), 0) AS total_revenue
            FROM transactions
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY sale_date DESC
        ", [$dateFrom, $dateTo]);

        $byCashier = DB::select("
            SELECT u.name AS cashier_name, COUNT(t.id) AS total_count, COALESCE(SUM(t.total), 0) AS total_revenue
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE DATE(t.created_at) BETWEEN ? AND ?
            GROUP BY t.user_id, u.name
            ORDER BY total_revenue DESC
        ", [$dateFrom, $dateTo]);

        return view('reports.index', compact(
            'summary', 'byPayment', 'topProducts', 'dailySales', 'byCashier', 'dateFrom', 'dateTo'
        ));
    }
}
