import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role_slug)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
