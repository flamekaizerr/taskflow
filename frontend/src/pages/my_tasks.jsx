import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth_store'
import { fetchMyTasks, fetchSharedTasks, markTaskStatus } from '../api'

const STATUS_CYCLE = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const STATUS_CLASS = { todo: 'badge-todo', in_progress: 'badge-progress', done: 'badge-done' }

function isOverdue(ticket) {
  if (!ticket.due_date || ticket.status === 'done') return false
  return new Date(ticket.due_date) < new Date(new Date().toDateString())
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

function TaskSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="task-row">
          <div className="skeleton" style={{ height: '0.9rem', width: '35%' }} />
          <div className="skeleton" style={{ height: '0.9rem', width: '18%', marginLeft: 'auto' }} />
          <div className="skeleton" style={{ height: '1.4rem', width: '70px', borderRadius: 'var(--r-full)' }} />
        </div>
      ))}
    </div>
  )
}

export default function MyTasks() {
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const [tab, setTab]                 = useState('mine')
  const [myTasks, setMyTasks]         = useState([])
  const [sharedTasks, setSharedTasks] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [filter, setFilter]           = useState('all')
  const [togglingId, setTogglingId]   = useState(null)

  useEffect(() => {
    Promise.all([fetchMyTasks(), fetchSharedTasks()])
      .then(([myRes, sharedRes]) => {
        setMyTasks(myRes.data)
        setSharedTasks(sharedRes.data)
      })
      .catch(() => setError('Could not load tasks.'))
      .finally(() => setLoading(false))
  }, [])

  const tasks = tab === 'mine' ? myTasks : sharedTasks

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter(t => t.status === filter)
  }, [tasks, filter])

  const cycleStatus = async (ticket) => {
    const next = STATUS_CYCLE[ticket.status]
    setTogglingId(ticket.id)
    try {
      const res = await markTaskStatus(ticket.id, { status: next })
      const merge = list => list.map(t =>
        t.id === ticket.id ? { ...res.data, workspace_name: t.workspace_name } : t
      )
      setMyTasks(merge)
      setSharedTasks(merge)
    } catch {
      setError('Could not update status.')
    } finally {
      setTogglingId(null)
    }
  }

  const TABS = [
    { key: 'mine',   label: 'My Tasks',    count: myTasks.length },
    { key: 'shared', label: 'Shared Tasks',  count: sharedTasks.length },  // unassigned — any member can pick up
  ]

  return (
    <div>
      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-sub">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--error-hi)', color: 'var(--error)', padding: 'var(--sp-3)',
          borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-5)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {/* ── My Tasks / Shared Tasks tabs ────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)', marginBottom: 'var(--sp-5)', gap: 'var(--sp-1)' }}>
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => { setTab(t.key); setFilter('all') }}
            style={{
              padding: 'var(--sp-2) var(--sp-4)',
              fontWeight: 500, fontSize: 'var(--text-sm)',
              color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
              marginBottom: '-1px', borderRadius: 0,
              background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.key ? 'var(--primary-hi)' : 'var(--surface-off)',
              color: tab === t.key ? 'var(--primary)' : 'var(--text-faint)',
              borderRadius: 'var(--r-full)', padding: '1px 8px',
              fontSize: 'var(--text-xs)', fontWeight: 600,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── status filter ───────────────────────────────────────────── */}
      <div className="task-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== 'all' && (
              <span style={{ marginLeft: 'var(--sp-1)', opacity: 0.7 }}>
                {tasks.filter(t => t.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── task list ───────────────────────────────────────────────── */}
      {loading ? (
        <TaskSkeleton />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{tab === 'mine' ? '🎯' : '👥'}</div>
          <h3>
            {filter === 'all'
              ? (tab === 'mine' ? 'No tasks assigned to you.' : 'No shared tasks right now.')
              : `No ${STATUS_LABEL[filter]} tasks.`}
          </h3>
          <p>{filter !== 'all' ? 'Try a different filter.' : 'Check back later.'}</p>
        </div>
      ) : (
        <div className="task-list">
          {filtered.map(ticket => {
            const overdue = isOverdue(ticket)
            return (
              <div key={ticket.id} className="task-row">
                {overdue && <div className="overdue-dot" title="Overdue" />}

                {/* title + project link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                  <div className="task-title">{ticket.title}</div>
                  <button
                    onClick={() => navigate(`/projects/${ticket.workspace_id}`)}
                    style={{
                      fontSize: 'var(--text-xs)', color: 'var(--text-faint)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, textAlign: 'left', width: 'fit-content',
                    }}
                  >
                    ↗ {ticket.workspace_name || `Project #${ticket.workspace_id}`}
                  </button>
                </div>

                {/* shared tasks are unassigned — no assignee chip */}

                {/* due date */}
                {ticket.due_date && (
                  <span className={`task-due ${overdue ? 'overdue' : ''}`}>
                    {overdue ? '⚠ ' : ''}{formatDate(ticket.due_date)}
                  </span>
                )}

                {/* status badge — always clickable on this page */}
                <div className="task-actions">
                  <button
                    className={`badge ${STATUS_CLASS[ticket.status]} badge-clickable`}
                    onClick={() => cycleStatus(ticket)}
                    disabled={togglingId === ticket.id}
                    title="Click to advance status"
                  >
                    {togglingId === ticket.id
                      ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                      : STATUS_LABEL[ticket.status]
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
