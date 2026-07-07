<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Dashboard') - PetShop E-POS</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ asset('css/pos.css') }}">
    @stack('styles')
</head>
<body>
    @php
        $user = auth()->user();
        $user->loadRole();
        $roleSlug = $user->role_slug ?? '';
    @endphp

    <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
            <div class="logo">🐾</div>
            <div class="brand-text">PetShop<br>E-POS</div>
        </div>

        <nav class="sidebar-menu">
            <div class="menu-label">Menu</div>
            <a href="{{ route('dashboard') }}" class="menu-item {{ request()->routeIs('dashboard') ? 'active' : '' }}">
                <i class="bi bi-speedometer2"></i> Dashboard
            </a>

            @if(in_array($roleSlug, ['admin', 'kasir', 'owner']))
            <div class="menu-label">Transaksi</div>
            <a href="{{ route('pos.index') }}" class="menu-item {{ request()->routeIs('pos.*') ? 'active' : '' }}">
                <i class="bi bi-cart3"></i> Kasir / POS
            </a>
            <a href="{{ route('transactions.index') }}" class="menu-item {{ request()->routeIs('transactions.*') ? 'active' : '' }}">
                <i class="bi bi-receipt"></i> Riwayat Transaksi
            </a>
            @endif

            @if(in_array($roleSlug, ['admin', 'owner']))
            <div class="menu-label">Inventory</div>
            <a href="{{ route('products.index') }}" class="menu-item {{ request()->routeIs('products.*') ? 'active' : '' }}">
                <i class="bi bi-box-seam"></i> Produk
            </a>
            <a href="{{ route('reports.index') }}" class="menu-item {{ request()->routeIs('reports.*') ? 'active' : '' }}">
                <i class="bi bi-bar-chart"></i> Laporan Penjualan
            </a>
            @endif

            @if($roleSlug === 'admin')
            <div class="menu-label">Manajemen</div>
            <a href="{{ route('categories.index') }}" class="menu-item {{ request()->routeIs('categories.*') ? 'active' : '' }}">
                <i class="bi bi-tags"></i> Kategori
            </a>
            <a href="{{ route('users.index') }}" class="menu-item {{ request()->routeIs('users.*') ? 'active' : '' }}">
                <i class="bi bi-people"></i> Pengguna & Role
            </a>
            @endif
        </nav>
    </aside>

    <div class="main-wrapper">
        <header class="topbar">
            <div class="topbar-left">
                <button class="btn-toggle" id="sidebarToggle"><i class="bi bi-list"></i></button>
            </div>
            <div class="topbar-right">
                <div class="topbar-info">
                    <strong>PetShop Dzikra</strong>
                    Sistem Kasir Elektronik
                </div>
                <div class="badge-role">
                    <i class="bi bi-shield-check"></i>
                    {{ $user->role_name ?? 'User' }}
                </div>
                <div class="user-dropdown">
                    <div class="user-avatar">{{ strtoupper(substr($user->name, 0, 1)) }}</div>
                    <div>
                        <strong>{{ $user->name }}</strong>
                        <form action="{{ route('logout') }}" method="POST" style="display:inline">
                            @csrf
                            <button type="submit" class="btn btn-sm btn-outline" style="margin-top:2px">
                                <i class="bi bi-box-arrow-right"></i> Logout
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </header>

        <main class="content-area">
            <h1 class="page-title">@yield('page-title', 'Dashboard')</h1>

            @if(session('success'))
            <div class="alert-custom alert-success" id="alertBox">
                <span class="alert-icon"><i class="bi bi-check-circle-fill"></i></span>
                <div class="alert-body">
                    <strong>Berhasil</strong>
                    {{ session('success') }}
                </div>
                <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
            </div>
            @endif

            @if(session('error'))
            <div class="alert-custom alert-danger" id="alertBox">
                <span class="alert-icon"><i class="bi bi-exclamation-circle-fill"></i></span>
                <div class="alert-body">
                    <strong>Gagal</strong>
                    {{ session('error') }}
                </div>
                <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
            </div>
            @endif

            @yield('content')
        </main>

        <footer class="footer">
            &copy; {{ date('Y') }} PetShop E-POS — Dibuat dengan Laravel
        </footer>
    </div>

    <script>
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('show');
        });

        setTimeout(() => {
            const alert = document.getElementById('alertBox');
            if (alert) alert.remove();
        }, 5000);

        function formatRupiah(n) {
            return 'Rp ' + Number(n).toLocaleString('id-ID');
        }
    </script>
    @stack('scripts')
</body>
</html>
