import { createContext, useContext, useEffect, useState } from 'react'
import { login as dbLogin, logActivity } from '../db/store'

const AuthContext = createContext(null)
const SESSION_KEY = 'pet_shop_session'
const SESSION_KEY_LEGACY = 'kasir_dzikra_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY_LEGACY)
    if (raw) {
      try {
        setUser(JSON.parse(raw))
        localStorage.setItem(SESSION_KEY, raw)
      } catch {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(SESSION_KEY_LEGACY)
      }
    }
    setReady(true)
  }, [])

  function signIn(email, password) {
    const res = dbLogin(email, password)
    if (res.ok) {
      setUser(res.user)
      localStorage.setItem(SESSION_KEY, JSON.stringify(res.user))
      localStorage.removeItem(SESSION_KEY_LEGACY)
    }
    return res
  }

  function signOut() {
    if (user) {
      logActivity({
        user,
        action: 'logout',
        module: 'auth',
        description: `${user.name} keluar dari aplikasi`,
      })
    }
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY_LEGACY)
  }

  const can = (...roles) => user && roles.includes(user.role_slug)

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
