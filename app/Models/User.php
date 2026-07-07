<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public ?string $role_name = null;

    public ?string $role_slug = null;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::retrieved(function (User $user) {
            $user->loadRole();
        });
    }

    public function loadRole(): void
    {
        if ($this->role_slug !== null || ! $this->role_id) {
            return;
        }

        $role = DB::selectOne('SELECT name, slug FROM roles WHERE id = ?', [$this->role_id]);

        if ($role) {
            $this->role_name = $role->name;
            $this->role_slug = $role->slug;
        }
    }

    public function isAdmin(): bool
    {
        return $this->role_slug === 'admin';
    }

    public function isKasir(): bool
    {
        return $this->role_slug === 'kasir';
    }

    public function isOwner(): bool
    {
        return $this->role_slug === 'owner';
    }
}
