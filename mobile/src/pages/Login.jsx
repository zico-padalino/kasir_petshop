import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  function handleSubmit(e) {
    e.preventDefault()
    const res = signIn(email, password)
    if (res.ok) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(res.message)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo">🐾</div>
          <h2>PetShop E-POS</h2>
          <p>Sistem Kasir Pet Shop</p>
        </div>

        {error && (
          <div className="alert-custom alert-danger">
            <span className="alert-icon"><i className="bi bi-exclamation-circle-fill"></i></span>
            <div className="alert-body"><strong>Gagal</strong> {error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@petshop.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            <i className="bi bi-box-arrow-in-right"></i> Masuk
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#666' }}>
          <strong>Demo Akun:</strong><br />
          Admin: admin@petshop.com<br />
          Kasir: kasir@petshop.com<br />
          Owner: owner@petshop.com<br />
          Password: <code>password</code>
        </div>
      </div>
    </div>
  )
}
