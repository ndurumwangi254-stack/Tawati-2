import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import TopNav from './TopNav'

export function ProtectedLayout() {
  const { currentUser, checkingSession } = useApp()
  if (checkingSession) return null
  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <div className="min-h-full flex flex-col">
      <TopNav />
      <div className="flex-1 p-6 sm:p-4 max-w-[1100px] w-full mx-auto">
        <Outlet />
      </div>
    </div>
  )
}

export function OwnerOnly({ children }) {
  const { currentUser } = useApp()
  if (currentUser?.role !== 'owner') {
    return (
      <div className="text-center py-14 px-4 text-muted">
        <div className="text-3xl mb-3">🔒</div>
        <h3 className="text-ink text-base mb-1">Owner access only</h3>
        <p className="text-sm">This page isn't available on a worker account.</p>
      </div>
    )
  }
  return children
}
