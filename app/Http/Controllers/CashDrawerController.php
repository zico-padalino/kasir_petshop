<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CashDrawerController extends Controller
{
    public function index()
    {
        $this->ensureDrawer();

        $drawer = DB::selectOne('SELECT * FROM cash_drawer ORDER BY id ASC LIMIT 1');
        $today = date('Y-m-d');

        $todayStats = DB::selectOne("
            SELECT
                COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) AS cash_in,
                COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) AS cash_out,
                COALESCE(SUM(CASE WHEN type = 'sale_cash' THEN amount ELSE 0 END), 0) AS sales,
                COALESCE(SUM(CASE WHEN type = 'hotel_cash' THEN amount ELSE 0 END), 0) AS hotel
            FROM cash_movements
            WHERE DATE(created_at) = ?
        ", [$today]);

        $movements = DB::select("
            SELECT m.*, u.name AS user_name
            FROM cash_movements m
            LEFT JOIN users u ON u.id = m.user_id
            ORDER BY m.id DESC
            LIMIT 80
        ");

        return view('cash-drawer.index', compact('drawer', 'todayStats', 'movements'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'mode' => 'required|in:in,out',
            'amount' => 'required|numeric|min:1',
            'note' => 'nullable|string|max:255',
        ]);

        $amount = (float) $data['amount'];
        $type = $data['mode'] === 'in' ? 'cash_in' : 'cash_out';
        $note = $data['note'] ?: ($type === 'cash_in' ? 'Setor uang kasir' : 'Tarik uang kasir');

        try {
            self::recordMovement($type, $amount, $note, null, Auth::id());
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage())->withInput();
        }

        $label = $type === 'cash_in' ? 'disetor' : 'ditarik';

        return back()->with('success', 'Uang berhasil '.$label.'.');
    }

    public static function recordMovement(string $type, float $amount, ?string $note = null, ?string $reference = null, ?int $userId = null): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            throw new \Exception('Nominal harus lebih dari 0.');
        }

        if (! Schema::hasTable('cash_drawer') || ! Schema::hasTable('cash_movements')) {
            return;
        }

        $exists = DB::selectOne('SELECT id FROM cash_drawer LIMIT 1');
        if (! $exists) {
            DB::insert('INSERT INTO cash_drawer (balance, created_at, updated_at) VALUES (0, NOW(), NOW())');
        }

        $run = function () use ($type, $amount, $note, $reference, $userId) {
            $drawer = DB::selectOne('SELECT * FROM cash_drawer ORDER BY id ASC LIMIT 1 FOR UPDATE');
            $balance = (float) ($drawer->balance ?? 0);
            $isOut = $type === 'cash_out';

            if ($isOut && $balance < $amount) {
                throw new \Exception('Saldo kas tidak cukup. Saldo saat ini Rp '.number_format($balance, 0, ',', '.').'.');
            }

            $next = $isOut ? $balance - $amount : $balance + $amount;
            $direction = $isOut ? 'out' : 'in';

            DB::update('UPDATE cash_drawer SET balance = ?, updated_at = NOW() WHERE id = ?', [$next, $drawer->id]);

            DB::insert("
                INSERT INTO cash_movements
                (type, direction, amount, balance_after, note, reference, user_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ", [
                $type,
                $direction,
                $amount,
                $next,
                $note,
                $reference,
                $userId,
            ]);
        };

        if (DB::transactionLevel() > 0) {
            $run();
        } else {
            DB::transaction($run);
        }
    }

    private function ensureDrawer(): void
    {
        if (! Schema::hasTable('cash_drawer')) {
            return;
        }

        $exists = DB::selectOne('SELECT id FROM cash_drawer LIMIT 1');
        if (! $exists) {
            DB::insert('INSERT INTO cash_drawer (balance, created_at, updated_at) VALUES (0, NOW(), NOW())');
        }
    }
}
