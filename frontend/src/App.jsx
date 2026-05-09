import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth_store'
import LoginPage    from './pages/login_page'
import Dashboard    from './pages/dashboard'
import Board        from './pages/board'
import TaskBoard    from './pages/task_board'
import MyTasks      from './pages/my_tasks'
import Layout       from './components/Layout'

// blocks route for unauthenticated users
function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh' }}>
      <div className="spinner spinner-lg" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="tasks"        element={<MyTasks />} />
          <Route path="projects"     element={<Board />} />
          <Route path="projects/:id" element={<TaskBoard />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
