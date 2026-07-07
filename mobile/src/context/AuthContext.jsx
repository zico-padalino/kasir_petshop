import { createContext, useContext, useEffect, useState } from 'react'
import { login as dbLogin } from '../db/store'

const AuthContext = createContext(null)
const SESSION_KEY = 'kasir_dzikra_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setReady(true)
  }, [])

  function signIn(email, password) {
    const res = dbLogin(email, password)
    if (res.ok) {
      setUser(res.user)
      localStorage.setItem(SESSION_KEY, JSON.stringify(res.user))
    }
    return res
  }

  function signOut() {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
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
