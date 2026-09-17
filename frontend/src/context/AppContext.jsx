import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // On load, if a token was saved from a previous visit, validate it
  // against the API rather than trusting whatever's in storage.
  useEffect(() => {
    const token = localStorage.getItem('tawati_token')
    if (!token) {
      setCheckingSession(false)
      return
    }
    api
      .get('/auth/me')
      .then((data) => setCurrentUser(data.user))
      .catch(() => {
        localStorage.removeItem('tawati_token')
      })
      .finally(() => setCheckingSession(false))
  }, [])

  async function login(username, password) {
    try {
      const data = await api.post('/auth/login', { username, password })
      localStorage.setItem('tawati_token', data.token)
      setCurrentUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.networkError ? err.message : err.message || 'Login failed' }
    }
  }

  function logout() {
    localStorage.removeItem('tawati_token')
    setCurrentUser(null)
  }

  return (
    <AppContext.Provider value={{ currentUser, login, logout, checkingSession }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
