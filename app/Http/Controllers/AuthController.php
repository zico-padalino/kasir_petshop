<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            Auth::user()->loadRole();

            return redirect()->route('dashboard');
        }

        return view('auth.login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = DB::selectOne(
            'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
            [$credentials['email']]
        );

        if (! $user || ! password_verify($credentials['password'], $user->password)) {
            return back()->with('error', 'Email atau password salah.')->withInput();
        }

        $authUser = \App\Models\User::find($user->id);
        $authUser->loadRole();
        Auth::login($authUser, $request->boolean('remember'));

        return redirect()->route('dashboard')->with('success', 'Selamat datang, '.$authUser->name.'!');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('success', 'Anda berhasil logout.');
    }
}
