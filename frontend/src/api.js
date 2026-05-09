import axios from 'axios'

// base URL from env (set VITE_API_URL on Vercel/Railway)
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client = axios.create({ baseURL: BASE })

// attach token on every request if we have one
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('tf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── auth ──────────────────────────────────────────────────────────────────────
export const loginUser    = (data) => client.post('/api/auth/login', data)
export const registerUser = (data) => client.post('/api/auth/register', data)
export const fetchMe      = ()     => client.get('/api/auth/me')

// ── dashboard ─────────────────────────────────────────────────────────────────
export const pullDashboardStats = () => client.get('/api/dashboard', {
  params: { tz_offset: new Date().getTimezoneOffset() }
})

// ── workspaces ────────────────────────────────────────────────────────────────
export const pullProjectList   = ()       => client.get('/api/workspaces')
export const pullWorkspace     = (id)     => client.get(`/api/workspaces/${id}`)
export const createProject     = (data)   => client.post('/api/workspaces', data)
export const wipeProject       = (id)     => client.delete(`/api/workspaces/${id}`)

// ── tickets ───────────────────────────────────────────────────────────────────
export const pullTasksForProject = (wsId) => client.get('/api/tickets', { params: { workspace_id: wsId } })
export const fetchMyTasks        = ()     => client.get('/api/tickets/mine')
export const fetchSharedTasks    = ()     => client.get('/api/tickets/shared')
export const createTicket        = (data) => client.post('/api/tickets', data)
export const markTaskStatus      = (id, data) => client.patch(`/api/tickets/${id}`, data)
export const wipeTicketFromBoard = (id)   => client.delete(`/api/tickets/${id}`)

// ── users ─────────────────────────────────────────────────────────────────────
export const fetchAllUsers = () => client.get('/api/users')
