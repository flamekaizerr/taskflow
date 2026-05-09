import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth_store'
import {
  pullTasksForProject, createTicket, markTaskStatus,
  wipeTicketFromBoard, fetchAllUsers, pullWorkspace
} from '../api'

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

function TaskSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-2)' }}>
      {[1,2,3,4].map(i => (
        <div key={i} className="task-row">
          <div className="skeleton" style={{ height:'0.9rem', width:'35%' }} />
          <div className="skeleton" style={{ height:'0.9rem', width:'15%', marginLeft:'auto' }} />
          <div className="skeleton" style={{ height:'1.4rem', width:'70px', borderRadius:'var(--r-full)' }} />
        </div>
      ))}
    </div>
  )
}

function AddTaskModal({ workspaceId, users, onClose, onAdded }) {
  const [form, setForm]       = useState({ title:'', description:'', due_date:'', assignee_id:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        workspace_id: workspaceId,
        due_date: form.due_date || null,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
      }
      const res = await createTicket(payload)
      onAdded(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add task.')
    } finally {
      setLoading(false)
    }
  }

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add task</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        {error && (
          <div style={{ background:'var(--error-hi)', color:'var(--error)', padding:'var(--sp-3)',
            borderRadius:'var(--r-md)', fontSize:'var(--text-sm)', marginBottom:'var(--sp-3)' }}>
            {error}
          </div>
        )}
        <form onSubmit={submit} className="modal-body">
          <div className="field">
            <label className="label">Title <span style={{color:'var(--error)'}}>*</span></label>
            <input className="input" placeholder="e.g. Fix login bug" autoFocus
              value={form.title} onChange={f('title')} />
          </div>
          <div className="field">
            <label className="label">Description</label>
            <textarea className="input" rows={2} style={{ resize:'vertical' }}
              placeholder="Any extra context…"
              value={form.description} onChange={f('description')} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap:'var(--sp-3)' }}>
            <div className="field">
              <label className="label">Due date</label>
              <input className="input" type="date" value={form.due_date} onChange={f('due_date')} />
            </div>
            <div className="field">
              <label className="label">Assign to</label>
              <select className="input" value={form.assignee_id} onChange={f('assignee_id')}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{ margin:0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" />Adding…</> : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TaskBoard() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const isAdmin      = user?.role === 'admin'

  const [tickets, setTickets]       = useState([])
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [filter, setFilter]         = useState('all')
  const [error, setError]           = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [wsName, setWsName]         = useState('')

  useEffect(() => {
    Promise.all([
      pullTasksForProject(id),
      pullWorkspace(id),
      isAdmin ? fetchAllUsers() : Promise.resolve({ data: [] }),
    ])
      .then(([tRes, wsRes, uRes]) => {
        setTickets(tRes.data)
        setWsName(wsRes.data.name)
        setUsers(uRes.data)
      })
      .catch((err) => {
        if (err.response?.status === 404) navigate('/projects')
        else setError('Could not load tasks.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets
    return tickets.filter(t => t.status === filter)
  }, [tickets, filter])

  const cycleStatus = async (ticket) => {
    const next = STATUS_CYCLE[ticket.status]
    setTogglingId(ticket.id)
    try {
      const res = await markTaskStatus(ticket.id, { status: next })
      setTickets(p => p.map(t => t.id === ticket.id ? res.data : t))
    } catch {
      setError('Could not update status.')
    } finally {
      setTogglingId(null)
    }
  }

  const deleteTask = async (ticket) => {
    setDeletingId(ticket.id)
    try {
      await wipeTicketFromBoard(ticket.id)
      setTickets(p => p.filter(t => t.id !== ticket.id))
    } catch {
      setError('Could not delete task.')
    } finally {
      setDeletingId(null)
    }
  }

  const FILTERS = [
    { key: 'all',         label: 'All' },
    { key: 'todo',        label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done',        label: 'Done' },
  ]

  return (
    <div>
      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/projects')}
            style={{ fontSize:'var(--text-sm)', color:'var(--text-muted)',
              marginBottom:'var(--sp-2)', display:'flex', alignItems:'center', gap:'var(--sp-1)',
              background:'none', border:'none', cursor:'pointer', padding:0 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Projects
          </button>
          <h1 className="page-title">{wsName}</h1>
          <p className="page-sub">{tickets.length} task{tickets.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add task
          </button>
        )}
      </div>

      {error && (
        <div style={{ background:'var(--error-hi)', color:'var(--error)', padding:'var(--sp-3)',
          borderRadius:'var(--r-md)', marginBottom:'var(--sp-5)', fontSize:'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {/* ── filter tabs ────────────────────────────────────────────── */}
      <div className="task-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== 'all' && (
              <span style={{ marginLeft:'var(--sp-1)', opacity:0.7 }}>
                {tickets.filter(t => t.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── task list ──────────────────────────────────────────────── */}
      {loading ? (
        <TaskSkeleton />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">✅</div>
          <h3>{filter === 'all' ? 'No tasks yet.' : `No ${STATUS_LABEL[filter]} tasks.`}</h3>
          <p>{isAdmin && filter === 'all' ? 'Add one up top.' : 'Change the filter to see others.'}</p>
          {isAdmin && filter === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add task</button>
          )}
        </div>
      ) : (
        <div className="task-list">
          {filtered.map(ticket => {
            const overdue = isOverdue(ticket)
            return (
              <div key={ticket.id} className="task-row">
                {/* overdue dot */}
                {overdue && <div className="overdue-dot" title="Overdue" />}

                <div className="task-title">{ticket.title}</div>

                {/* assignee */}
                {ticket.assignee && (
                  <div className="task-assignee">
                    <div className="avatar" style={{ width:20, height:20, fontSize:'0.6rem' }}>
                      {ticket.assignee.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                    </div>
                    <span style={{ display:'none' }}>{ticket.assignee.name}</span>
                  </div>
                )}

                {/* due date */}
                {ticket.due_date && (
                  <span className={`task-due ${overdue ? 'overdue' : ''}`}>
                    {overdue ? '⚠ ' : ''}{formatDate(ticket.due_date)}
                  </span>
                )}

                <div className="task-actions">
                  {/* status badge — clickable only for admins or the assigned member */}
                  {(() => {
                    const MEMBER_POOL = 'member@demo.com'
                    const canEdit = isAdmin
                      || ticket.assignee_id === null
                      || ticket.assignee_id === user?.id
                      || ticket.assignee?.email === MEMBER_POOL
                    return (
                      <button
                        className={`badge ${STATUS_CLASS[ticket.status]} ${canEdit ? 'badge-clickable' : ''}`}
                        onClick={() => canEdit && cycleStatus(ticket)}
                        disabled={!canEdit || togglingId === ticket.id}
                        title={canEdit ? 'Click to advance status' : 'Only admins can update this task'}
                        style={!canEdit ? { cursor: 'default', opacity: 0.6 } : {}}
                      >
                        {togglingId === ticket.id
                          ? <span className="spinner" style={{ width:10, height:10, borderWidth:1.5 }} />
                          : STATUS_LABEL[ticket.status]
                        }
                      </button>
                    )
                  })()}

                  {/* delete — admin only */}
                  {isAdmin && (
                    <button
                      className="btn btn-icon btn-danger btn-sm"
                      onClick={() => deleteTask(ticket)}
                      disabled={deletingId === ticket.id}
                      aria-label="Delete task"
                    >
                      {deletingId === ticket.id
                        ? <span className="spinner" style={{ width:10, height:10, borderWidth:1.5 }} />
                        : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                          </svg>
                        )
                      }
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddTaskModal
          workspaceId={parseInt(id)}
          users={users}
          onClose={() => setShowAdd(false)}
          onAdded={(t) => setTickets(p => [t, ...p])}
        />
      )}
    </div>
  )
}
