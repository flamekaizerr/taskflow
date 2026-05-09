import { useEffect, useState } from 'react'
import { useAuth } from '../auth_store'
import { pullDashboardStats } from '../api'

// simple skeleton block
function Skel({ w = '100%', h = '1.2rem', style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, ...style }} />
}

function StatCard({ label, value, variant, loading }) {
  return (
    <div className={`stat-card ${variant || ''}`}>
      <div className="stat-label">{label}</div>
      {loading
        ? <Skel h="2.5rem" w="60%" style={{ marginTop: '0.5rem' }} />
        : <div className="stat-value">{value ?? '—'}</div>
      }
    </div>
  )
}

function BarChart({ data, loading }) {
  const max = Math.max(data.todo, data.in_progress, data.done, 1)

  const bars = [
    { key: 'todo',        label: 'To Do',       cls: 'bar-todo',     val: data.todo },
    { key: 'in_progress', label: 'In Progress',  cls: 'bar-progress', val: data.in_progress },
    { key: 'done',        label: 'Done',         cls: 'bar-done',     val: data.done },
  ]

  return (
    <div className="chart-section">
      <div className="chart-title">Tasks by status</div>
      {loading ? (
        <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-end', height: '140px' }}>
          {[70, 50, 90].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', alignItems: 'center' }}>
              <Skel h={`${h}px`} />
              <Skel h="0.75rem" w="60%" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bar-chart">
          {bars.map(({ key, label, cls, val }, i) => {
            const pct = max === 0 ? 0 : (val / max) * 100
            return (
              <div key={key} className="bar-group">
                <div className="bar-count">{val}</div>
                <div className="bar-wrap">
                  <div
                    className={`bar ${cls}`}
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      animationDelay: `${i * 80}ms`
                    }}
                  />
                </div>
                <div className="bar-name">{label}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user }                  = useAuth()
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    pullDashboardStats()
      .then(r => setStats(r.data))
      .catch(() => setError('Could not load stats. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const byStatus = stats?.by_status || { todo: 0, in_progress: 0, done: 0 }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Hey {user?.name?.split(' ')[0]}, here's what's going on.</p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--error-hi)', color: 'var(--error)',
          padding: 'var(--sp-4)', borderRadius: 'var(--r-md)',
          marginBottom: 'var(--sp-6)', fontSize: 'var(--text-sm)'
        }}>
          {error}
        </div>
      )}

      {/* ── 4 stat cards ─────────────────────────────────────────────── */}
      <div className="stat-grid">
        <StatCard label="Projects"    value={stats?.total_workspaces} loading={loading} />
        <StatCard label="Total tasks" value={stats?.total_tickets}    loading={loading} />
        <StatCard label="Done"        value={byStatus.done}           loading={loading} />
        <StatCard
          label="Overdue"
          value={stats?.overdue_count}
          variant={stats?.overdue_count > 0 ? 'overdue' : ''}
          loading={loading}
        />
      </div>

      {/* ── bar chart ─────────────────────────────────────────────────── */}
      {!error && <BarChart data={byStatus} loading={loading} />}

      {/* empty state if truly no data */}
      {!loading && !error && stats?.total_tickets === 0 && (
        <div className="empty" style={{ marginTop: 0 }}>
          <div className="empty-icon">📋</div>
          <h3>Nothing here yet.</h3>
          <p>Create a project and add some tasks to see stats here.</p>
        </div>
      )}
    </div>
  )
}
