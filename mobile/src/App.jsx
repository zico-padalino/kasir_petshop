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
import PetHotel from './pages/PetHotel'
import PetHotelForm from './pages/PetHotelForm'
import PetHotelDetail from './pages/PetHotelDetail'
import PetHotelRooms from './pages/PetHotelRooms'
import StockOpname from './pages/StockOpname'
import StockOpnameDetail from './pages/StockOpnameDetail'
import ActivityLogs from './pages/ActivityLogs'
import CashDrawer from './pages/CashDrawer'
import Attendance from './pages/Attendance'
import AttendanceForm from './pages/AttendanceForm'
import ShopSettings from './pages/ShopSettings'

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
          path="/cash-drawer"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <CashDrawer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/form"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <AttendanceForm />
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
          path="/pet-hotel"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <PetHotel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pet-hotel/create"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <PetHotelForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pet-hotel/rooms"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <PetHotelRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pet-hotel/:id"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <PetHotelDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pet-hotel/:id/edit"
          element={
            <ProtectedRoute roles={['admin', 'kasir', 'owner']}>
              <PetHotelForm />
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
          path="/activity-logs"
          element={
            <ProtectedRoute roles={['owner']}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-opname"
          element={
            <ProtectedRoute roles={['admin', 'owner']}>
              <StockOpname />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-opname/:id"
          element={
            <ProtectedRoute roles={['admin', 'owner']}>
              <StockOpnameDetail />
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
          path="/settings"
          element={
            <ProtectedRoute roles={['admin', 'owner']}>
              <ShopSettings />
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
            <ProtectedRoute roles={['admin', 'owner']}>
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
