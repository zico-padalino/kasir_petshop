import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pos from './pages/Pos'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Receipt from './pages/Receipt'
import Reports from './pages/Reports'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Categories from './pages/Categories'
import Users from './pages/Users'

export default function App() {
  const { ready } = useAuth()
  if (!ready) return null

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Struk: halaman berdiri sendiri (untuk dicetak) */}
      <Route
        path="/transactions/:id/receipt"
        element={
          <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
            <Receipt />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/pos"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <Pos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/:id"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <TransactionDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['admin', 'owner']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute roles={['admin', 'owner']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/create"
          element={
            <ProtectedRoute roles={['admin']}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute roles={['admin']}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute roles={['admin']}>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
