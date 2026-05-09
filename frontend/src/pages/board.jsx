import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth_store'
import { pullProjectList, createProject, wipeProject } from '../api'

function ProjectSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%),1fr))', gap: 'var(--sp-4)' }}>
      {[1,2,3].map(i => (
        <div key={i} className="card" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>
          <div className="skeleton" style={{ height:'1.2rem', width:'55%' }} />
          <div className="skeleton" style={{ height:'0.9rem', width:'85%' }} />
          <div className="skeleton" style={{ height:'0.9rem', width:'40%', marginTop:'var(--sp-2)' }} />
        </div>
      ))}
    </div>
  )
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setLoading(true)
    try {
      const res = await createProject({ name: form.name.trim(), description: form.description.trim() || null })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create project.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New project</span>
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
            <label className="label">Project name <span style={{color:'var(--error)'}}>*</span></label>
            <input className="input" placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} autoFocus />
          </div>
          <div className="field">
            <label className="label">Description <span style={{color:'var(--text-faint)',fontWeight:400}}>(optional)</span></label>
            <textarea className="input" rows={3} placeholder="What's this project about?"
              style={{ resize:'vertical' }}
              value={form.description} onChange={e => setForm(p=>({...p, description: e.target.value}))} />
          </div>
          <div className="modal-footer" style={{ margin: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" />Creating…</> : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({ name, onClose, onConfirm, loading }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          <span className="modal-title">Delete project?</span>
        </div>
        <p style={{ fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>
          "<strong style={{color:'var(--text)'}}>{name}</strong>" and all its tasks will be gone permanently.
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}
            style={{ background:'var(--error)', color:'var(--text-inv)', borderColor:'var(--error)' }}>
            {loading ? <><span className="spinner" />Deleting…</> : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Board() {
  const { user }                    = useAuth()
  const navigate                    = useNavigate()
  const isAdmin                     = user?.role === 'admin'
  const [projects, setProjects]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [delTarget, setDelTarget]   = useState(null)  // {id, name}
  const [delLoading, setDelLoading] = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    pullProjectList()
      .then(r => setProjects(r.data))
      .catch(() => setError('Could not load projects.'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async () => {
    setDelLoading(true)
    try {
      await wipeProject(delTarget.id)
      setProjects(p => p.filter(ws => ws.id !== delTarget.id))
      setDelTarget(null)
    } catch {
      setError('Could not delete project.')
    } finally {
      setDelLoading(false)
    }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {/* admin-only button */}
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New project
          </button>
        )}
      </div>

      {error && (
        <div style={{ background:'var(--error-hi)', color:'var(--error)', padding:'var(--sp-3)',
          borderRadius:'var(--r-md)', marginBottom:'var(--sp-5)', fontSize:'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <ProjectSkeleton />
      ) : projects.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📁</div>
          <h3>No projects yet.</h3>
          <p>{isAdmin ? 'Add one up top.' : 'Ask an admin to create one.'}</p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New project</button>
          )}
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(ws => (
            <div key={ws.id} className="project-card">
              <div className="project-card-top">
                <div className="project-name">{ws.name}</div>
                {isAdmin && (
                  <button
                    className="btn btn-icon btn-danger"
                    onClick={(e) => { e.stopPropagation(); setDelTarget({ id: ws.id, name: ws.name }) }}
                    aria-label={`Delete ${ws.name}`}
                    style={{ flexShrink: 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                )}
              </div>

              {ws.description && (
                <p className="project-desc">{ws.description}</p>
              )}

              <div className="project-meta">
                <span className="project-ticket-count">
                  {ws.ticket_count} task{ws.ticket_count !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize:'var(--text-xs)', color:'var(--text-faint)' }}>
                  {formatDate(ws.created_at)}
                </span>
              </div>

              <button
                className="btn btn-ghost"
                style={{ width:'100%', justifyContent:'center', marginTop:'var(--sp-1)' }}
                onClick={() => navigate(`/projects/${ws.id}`)}
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(ws) => setProjects(p => [{ ...ws, ticket_count: 0 }, ...p])}
        />
      )}

      {delTarget && (
        <ConfirmModal
          name={delTarget.name}
          loading={delLoading}
          onClose={() => setDelTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
