import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth_store'
import { loginUser, registerUser, fetchMe } from '../api'

export default function LoginPage() {
  const [tab, setTab]         = useState('login')   // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { storeLogin }        = useAuth()
  const navigate              = useNavigate()

  // login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  // register form state
  const [regForm, setRegForm] = useState({
    name: '', email: '', password: '', confirm: '', role: 'member'
  })

  // field-level errors
  const [regErrors, setRegErrors] = useState({})

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!loginForm.email || !loginForm.password) {
      setError('Fill in both fields.')
      return
    }
    setLoading(true)
    try {
      const res  = await loginUser({ email: loginForm.email, password: loginForm.password })
      sessionStorage.setItem('tf_token', res.data.access_token)
      const me   = await fetchMe()
      storeLogin(res.data.access_token, me.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const validateReg = () => {
    const errs = {}
    if (!regForm.name.trim())               errs.name     = 'Name is required.'
    if (!regForm.email.includes('@'))        errs.email    = 'Enter a valid email.'
    if (regForm.password.length < 6)         errs.password = 'At least 6 characters.'
    if (regForm.password !== regForm.confirm) errs.confirm  = "Passwords don't match."
    return errs
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    const errs = validateReg()
    if (Object.keys(errs).length) { setRegErrors(errs); return }
    setRegErrors({})
    setLoading(true)
    try {
      const res = await registerUser({
        name: regForm.name, email: regForm.email,
        password: regForm.password, role: regForm.role,
      })
      sessionStorage.setItem('tf_token', res.data.access_token)
      const me = await fetchMe()
      storeLogin(res.data.access_token, me.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const lf = (field) => (e) => setLoginForm(p => ({ ...p, [field]: e.target.value }))
  const rf = (field) => (e) => setRegForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 'var(--sp-4)',
      background: 'var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-8)', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--primary)' }}>TaskFlow</span>
        </div>

        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          {/* tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--divider)',
            marginBottom: 'var(--sp-5)', gap: 'var(--sp-1)'
          }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setRegErrors({}) }}
                style={{
                  padding: 'var(--sp-2) var(--sp-4)',
                  fontWeight: 500, fontSize: 'var(--text-sm)',
                  color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                  marginBottom: '-1px', borderRadius: 0,
                  background: 'none', border: 'none',
                  borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {t === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>

          {/* global error */}
          {error && (
            <div style={{
              background: 'var(--error-hi)', color: 'var(--error)',
              padding: 'var(--sp-3)', borderRadius: 'var(--r-md)',
              fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)',
              border: '1px solid var(--error-hi)'
            }}>
              {error}
            </div>
          )}

          {/* ── login form ─────────────────────────────────────────────── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={loginForm.email} onChange={lf('email')} autoComplete="email" />
              </div>
              <div className="field">
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={loginForm.password} onChange={lf('password')} autoComplete="current-password" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--sp-2)' }}>
                {loading ? <><span className="spinner" />Logging in…</> : 'Log in'}
              </button>
            </form>
          )}

          {/* ── register form ──────────────────────────────────────────── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div className="field">
                <label className="label">Full name</label>
                <input className={`input ${regErrors.name ? 'input-error' : ''}`}
                  placeholder="Alex Johnson" value={regForm.name} onChange={rf('name')} />
                {regErrors.name && <span className="field-error">{regErrors.name}</span>}
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className={`input ${regErrors.email ? 'input-error' : ''}`}
                  type="email" placeholder="you@example.com"
                  value={regForm.email} onChange={rf('email')} autoComplete="email" />
                {regErrors.email && <span className="field-error">{regErrors.email}</span>}
              </div>
              <div className="field">
                <label className="label">Password</label>
                <input className={`input ${regErrors.password ? 'input-error' : ''}`}
                  type="password" placeholder="min. 6 characters"
                  value={regForm.password} onChange={rf('password')} />
                {regErrors.password && <span className="field-error">{regErrors.password}</span>}
              </div>
              <div className="field">
                <label className="label">Confirm password</label>
                <input className={`input ${regErrors.confirm ? 'input-error' : ''}`}
                  type="password" placeholder="same again"
                  value={regForm.confirm} onChange={rf('confirm')} />
                {regErrors.confirm && <span className="field-error">{regErrors.confirm}</span>}
              </div>
              <div className="field">
                <label className="label">Role</label>
                <select className="input" value={regForm.role} onChange={rf('role')}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--sp-2)' }}>
                {loading ? <><span className="spinner" />Creating account…</> : 'Create account'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
