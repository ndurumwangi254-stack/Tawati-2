import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ProtectedLayout, OwnerOnly } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dispense from './pages/Dispense'
import Inventory from './pages/Inventory'
import Products from './pages/Products'
import StockMovements from './pages/StockMovements'
import Suppliers from './pages/Suppliers'
import Patients from './pages/Patients'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dispense" element={<Dispense />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/products" element={<Products />} />
            <Route
              path="/stock"
              element={
                <OwnerOnly>
                  <StockMovements />
                </OwnerOnly>
              }
            />
            <Route
              path="/suppliers"
              element={
                <OwnerOnly>
                  <Suppliers />
                </OwnerOnly>
              }
            />
            <Route path="/patients" element={<Patients />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route
              path="/reports"
              element={
                <OwnerOnly>
                  <Reports />
                </OwnerOnly>
              }
            />
            <Route
              path="/settings"
              element={
                <OwnerOnly>
                  <Settings />
                </OwnerOnly>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
