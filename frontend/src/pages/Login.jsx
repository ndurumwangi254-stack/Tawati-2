import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { btn, field, fieldLabel, fieldInput, banner, brandMark } from '../styles/ui'

export default function Login() {
  const { currentUser, login } = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (currentUser) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    const result = await login(username, password)
    if (result.ok) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        className="w-full max-w-[360px] bg-white border border-border rounded-[10px] px-6 py-8 text-center"
        onSubmit={handleSubmit}
      >
        <div className={`${brandMark} w-11 h-11 text-xl mx-auto mb-4`}>T</div>
        <h1 className="text-xl mb-6">Tawati Chemist</h1>

        {error && <div className={banner.danger}>{error}</div>}

        <div className={`${field} text-left`}>
          <label className={fieldLabel} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className={fieldInput}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="owner or jane"
            autoFocus
          />
        </div>
        <div className={`${field} text-left`}>
          <label className={fieldLabel} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={fieldInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button className={`${btn.primary} w-full`} type="submit">
          Log in
        </button>

        <p className="text-muted text-[13px] mt-4">
          Demo accounts — <strong>owner</strong> / owner123 or <strong>jane</strong> / worker123
        </p>
      </form>
    </div>
  )
}
