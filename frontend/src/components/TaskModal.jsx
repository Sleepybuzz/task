import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function TaskModal({ task, members, isAdmin, currentUserId, onClose, onCreate, onUpdate, onDelete }) {
  const isNew = !task;
  const canEditAll = isAdmin;
  const canEditStatus = isAdmin || (task && task.assigned_to === currentUserId);

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, assigned_to: form.assigned_to || null };
      if (isNew) {
        await onCreate(payload);
      } else {
        await onUpdate(task.id, payload);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusOnly = async (newStatus) => {
    setLoading(true);
    try {
      await onUpdate(task.id, { ...task, status: newStatus });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'New Task' : (canEditAll ? 'Edit Task' : 'Task Details')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Read-only view for members who don't own the task */}
        {!isNew && !canEditAll && !canEditStatus && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{task.title}</h3>
              {task.description && <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>{task.description}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-3)' }}>Status</span><br /><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>Priority</span><br /><span className={`badge badge-${task.priority}`}>{task.priority}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>Assigned to</span><br />{task.assigned_to_name || 'Unassigned'}</div>
              <div><span style={{ color: 'var(--text-3)' }}>Due Date</span><br />{task.due_date ? formatDate(task.due_date) : '—'}</div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        )}

        {/* Status-only for assigned member */}
        {!isNew && !canEditAll && canEditStatus && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{task.title}</h3>
              {task.description && <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 12 }}>{task.description}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-3)' }}>Priority</span><br /><span className={`badge badge-${task.priority}`}>{task.priority}</span></div>
                <div><span style={{ color: 'var(--text-3)' }}>Due Date</span><br />{task.due_date ? formatDate(task.due_date) : '—'}</div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Update Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={loading} onClick={() => handleStatusOnly(form.status)}>
                {loading ? '...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}

        {/* Full edit form for admins */}
        {(isNew || canEditAll) && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title..." required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..." rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Assigned To</label>
                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 4 }}>
              <div>
                {!isNew && (
                  <button type="button" className="btn btn-danger btn-sm"
                    onClick={() => onDelete(task.id)}>Delete</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '...' : (isNew ? 'Create Task' : 'Save Changes')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Metadata footer */}
        {!isNew && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-3)' }}>
            <span>Created by {task.created_by_name}</span>
            <span>Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}
