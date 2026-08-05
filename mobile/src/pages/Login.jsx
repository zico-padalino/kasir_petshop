import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { unlockAttendanceSession } from '../utils/attendanceSession'

const DEMOS = [
  { label: 'Admin (semua fitur)', email: 'admin@petshop.com', emoji: '👑' },
  { label: 'Kasir (jual & titip)', email: 'kasir@petshop.com', emoji: '🛒' },
  { label: 'Owner (lihat laporan)', email: 'owner@petshop.com', emoji: '📊' },
]

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const redirectTo = location.state?.from || '/dashboard'

  useEffect(() => {
    if (user) goAfterLogin(redirectTo)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function goAfterLogin(target) {
    if (String(target).includes('attendance/form')) {
      unlockAttendanceSession()
    }
    navigate(target, { replace: true })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const res = signIn(email, password)
    if (res.ok) goAfterLogin(redirectTo)
    else setError(res.message)
  }

  function quickLogin(demoEmail) {
    setEmail(demoEmail)
    setPassword('password')
    setError('')
    const res = signIn(demoEmail, 'password')
    if (res.ok) goAfterLogin(redirectTo)
    else setError(res.message)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo">🐾</div>
          <h2>PetShop Dzikra</h2>
          <p>Kasir & penitipan hewan — mudah dipakai</p>
        </div>

        {error && (
          <div className="alert-custom alert-danger">
            <span className="alert-icon"><i className="bi bi-exclamation-circle-fill"></i></span>
            <div className="alert-body"><strong>Gagal masuk</strong> {error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email akun</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh: kasir@petshop.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Kata sandi</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 4,
                }}
                aria-label="Tampilkan sandi"
              >
                <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }}>
            <i className="bi bi-box-arrow-in-right"></i> Masuk ke Toko
          </button>
        </form>

        <div className="login-quick">
          <div className="login-quick-title">Coba cepat (uji coba)</div>
          <p className="login-quick-hint">Ketuk salah satu — tidak perlu ketik email/sandi</p>
          {DEMOS.map((d) => (
            <button key={d.email} type="button" className="login-quick-btn" onClick={() => quickLogin(d.email)}>
              <span>{d.emoji}</span>
              <span>{d.label}</span>
              <i className="bi bi-chevron-right"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
