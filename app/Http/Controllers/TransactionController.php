<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $dateFrom = $request->query('date_from', date('Y-m-d'));
        $dateTo = $request->query('date_to', date('Y-m-d'));
        $search = $request->query('search');
        $user = Auth::user();

        $query = "
            SELECT t.*, u.name AS cashier_name
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE DATE(t.created_at) BETWEEN ? AND ?
        ";
        $params = [$dateFrom, $dateTo];

        if ($user->isKasir()) {
            $query .= ' AND t.user_id = ?';
            $params[] = $user->id;
        }

        if ($search) {
            $query .= ' AND (t.invoice_number LIKE ? OR t.customer_name LIKE ?)';
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $query .= ' ORDER BY t.created_at DESC';

        $transactions = DB::select($query, $params);

        $kasirFilter = $user->isKasir() ? ' AND t.user_id = ?' : '';
        $summaryParams = $user->isKasir()
            ? [$dateFrom, $dateTo, $user->id]
            : [$dateFrom, $dateTo];

        $summary = DB::selectOne("
            SELECT COUNT(*) AS total_count, COALESCE(SUM(total), 0) AS total_revenue
            FROM transactions t
            WHERE DATE(t.created_at) BETWEEN ? AND ?{$kasirFilter}
        ", $summaryParams);

        return view('transactions.index', compact('transactions', 'summary', 'dateFrom', 'dateTo', 'search'));
    }

    public function show(int $id)
    {
        $user = Auth::user();
        $data = $this->getTransactionData($id, $user);

        if (! $data) {
            return redirect()->route('transactions.index')->with('error', 'Transaksi tidak ditemukan.');
        }

        return view('transactions.show', $data);
    }

    public function receipt(int $id)
    {
        $user = Auth::user();
        $data = $this->getTransactionData($id, $user);

        if (! $data) {
            abort(404);
        }

        return view('transactions.receipt', $data);
    }

    private function getTransactionData(int $id, $user): ?array
    {
        $transaction = DB::selectOne("
            SELECT t.*, u.name AS cashier_name
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE t.id = ?
        ", [$id]);

        if (! $transaction) {
            return null;
        }

        if ($user->isKasir() && $transaction->user_id != $user->id) {
            abort(403);
        }

        $items = DB::select('SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY id', [$id]);

        return compact('transaction', 'items');
    }
}
