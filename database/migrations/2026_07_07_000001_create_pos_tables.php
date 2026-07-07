<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles')) {
            DB::unprepared(File::get(database_path('sql/schema.sql')));
        }

        if (! Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('role_id')->nullable()->after('id');
                $table->boolean('is_active')->default(true)->after('password');
            });
        }

        if (Schema::hasTable('roles') && DB::table('roles')->count() === 0) {
            DB::unprepared(File::get(database_path('sql/seed.sql')));
        }

        if (DB::table('users')->where('email', 'admin@petshop.com')->doesntExist()) {
            DB::table('users')->insert([
                [
                    'name' => 'Admin PetShop',
                    'email' => 'admin@petshop.com',
                    'password' => Hash::make('password'),
                    'role_id' => 1,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Kasir Dzikra',
                    'email' => 'kasir@petshop.com',
                    'password' => Hash::make('password'),
                    'role_id' => 2,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Owner PetShop',
                    'email' => 'owner@petshop.com',
                    'password' => Hash::make('password'),
                    'role_id' => 3,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn(['role_id', 'is_active']);
            });
        }

        DB::statement('DROP TABLE IF EXISTS transaction_items');
        DB::statement('DROP TABLE IF EXISTS transactions');
        DB::statement('DROP TABLE IF EXISTS products');
        DB::statement('DROP TABLE IF EXISTS categories');
        DB::statement('DROP TABLE IF EXISTS roles');
    }
};
