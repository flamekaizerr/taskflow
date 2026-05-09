import { createContext, useContext, useState, useEffect } from 'react'
import { fetchMe } from './api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // try to restore session on page reload
    const token = sessionStorage.getItem('tf_token')
    if (!token) { setLoading(false); return }
    fetchMe()
      .then(r => setUser(r.data))
      .catch(() => sessionStorage.removeItem('tf_token'))
      .finally(() => setLoading(false))
  }, [])

  const storeLogin = (token, userData) => {
    sessionStorage.setItem('tf_token', token)
    setUser(userData)
  }

  const kickOutUnauthorized = () => {
    sessionStorage.removeItem('tf_token')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, storeLogin, kickOutUnauthorized }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
