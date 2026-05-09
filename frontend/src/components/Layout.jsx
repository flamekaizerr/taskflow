import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth_store'

export default function Layout() {
  const { user, kickOutUnauthorized } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    kickOutUnauthorized()
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'

  return (
    <div className="app-shell">
      <nav className="sidebar">
        {/* logo */}
        <NavLink to="/dashboard" className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          TaskFlow
        </NavLink>

        {/* nav links */}
        <NavLink to="/dashboard" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1"/>
            <rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/>
            <rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/tasks" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Tasks
        </NavLink>
        <NavLink to="/projects" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>
          </svg>
          Projects
        </NavLink>

        <div className="sidebar-spacer" />

        {/* user info + logout */}
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div style={{flex:1, minWidth:0}}>
            <div className="sidebar-user-name" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="btn-icon btn-ghost" style={{padding:'var(--sp-1)',minHeight:'auto',minWidth:'auto'}} title="Log out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
