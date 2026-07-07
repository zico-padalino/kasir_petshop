<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - PetShop E-POS</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ asset('css/pos.css') }}">
</head>
<body>
    <div class="login-page">
        <div class="login-card">
            <div class="login-logo">
                <div class="logo">🐾</div>
                <h2>PetShop E-POS</h2>
                <p>Sistem Kasir Pet Shop</p>
            </div>

            @if(session('error'))
            <div class="alert-custom alert-danger">
                <span class="alert-icon"><i class="bi bi-exclamation-circle-fill"></i></span>
                <div class="alert-body"><strong>Gagal</strong> {{ session('error') }}</div>
            </div>
            @endif

            @if(session('success'))
            <div class="alert-custom alert-success">
                <span class="alert-icon"><i class="bi bi-check-circle-fill"></i></span>
                <div class="alert-body"><strong>Berhasil</strong> {{ session('success') }}</div>
            </div>
            @endif

            <form method="POST" action="{{ route('login') }}">
                @csrf
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-control" value="{{ old('email') }}" placeholder="admin@petshop.com" required autofocus>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" placeholder="••••••••" required>
                </div>
                <div class="form-group" style="display:flex;align-items:center;gap:8px">
                    <input type="checkbox" name="remember" id="remember">
                    <label for="remember" style="margin:0;font-weight:400">Ingat saya</label>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px">
                    <i class="bi bi-box-arrow-in-right"></i> Masuk
                </button>
            </form>

            <div style="margin-top:24px;padding:16px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#666">
                <strong>Demo Akun:</strong><br>
                Admin: admin@petshop.com<br>
                Kasir: kasir@petshop.com<br>
                Owner: owner@petshop.com<br>
                Password: <code>password</code>
            </div>
        </div>
    </div>
</body>
</html>
