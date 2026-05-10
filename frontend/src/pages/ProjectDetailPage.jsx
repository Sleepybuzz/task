import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TaskModal from '../components/TaskModal';
import './ProjectDetailPage.css';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-2)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];
const PRIORITY_COLORS = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--text-3)' };

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [taskModal, setTaskModal] = useState(null); // null | 'create' | task object
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  useEffect(() => { fetchAll(); }, [projectId]);

  const fetchAll = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(pRes.data.project);
      setMembers(pRes.data.members);
      setTasks(tRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = project?.my_role === 'admin';

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const tasksByStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const handleCreateTask = async (data) => {
    const r = await api.post(`/projects/${projectId}/tasks`, data);
    setTasks(ts => [r.data.task, ...ts]);
    setTaskModal(null);
    addToast('Task created!');
  };

  const handleUpdateTask = async (taskId, data) => {
    const r = await api.put(`/projects/${projectId}/tasks/${taskId}`, data);
    setTasks(ts => ts.map(t => t.id === taskId ? r.data.task : t));
    setTaskModal(null);
    addToast('Task updated!');
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    setTasks(ts => ts.filter(t => t.id !== taskId));
    setTaskModal(null);
    addToast('Task deleted');
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const r = await api.put(`/projects/${projectId}/tasks/${task.id}`, { ...task, status: newStatus });
      setTasks(ts => ts.map(t => t.id === task.id ? r.data.task : t));
    } catch (err) {
      addToast(err.response?.data?.error || 'Update failed', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await api.delete(`/projects/${projectId}`);
    addToast('Project deleted');
    navigate('/projects');
  };

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (!project) return null;

  return (
    <div className="page-content project-detail">
      {/* Header */}
      <div className="project-detail-header">
        <div className="pdh-left">
          <div className="project-icon-lg" style={{ background: project.color + '22', color: project.color }}>
            {project.name[0].toUpperCase()}
          </div>
          <div>
            <div className="pdh-title-row">
              <h1>{project.name}</h1>
              <span className={`badge badge-${project.my_role}`}>{project.my_role}</span>
            </div>
            {project.description && <p className="pdh-desc">{project.description}</p>}
          </div>
        </div>
        <div className="pdh-actions">
          <div className="members-stack">
            {members.slice(0, 4).map(m => (
              <div key={m.id} className="avatar avatar-sm member-avatar" title={m.name}>
                {m.name[0].toUpperCase()}
              </div>
            ))}
            {members.length > 4 && <div className="avatar avatar-sm member-more">+{members.length - 4}</div>}
          </div>
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMembersModal(true)}>
              <PersonIcon /> Members
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setTaskModal('create')}>
              <PlusIcon /> Add Task
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-ghost btn-icon" onClick={() => setShowSettingsModal(true)}>
              <GearIcon />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>Board</button>
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>List</button>
        <div className="tab-filters">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Board view */}
      {tab === 'board' && (
        <div className="kanban-board">
          {STATUS_COLS.map(col => (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-dot" style={{ background: col.color }} />
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{tasksByStatus[col.key].length}</span>
              </div>
              <div className="kanban-cards">
                {tasksByStatus[col.key].length === 0 && (
                  <div className="kanban-empty">No tasks</div>
                )}
                {tasksByStatus[col.key].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    currentUserId={user.id}
                    onOpen={() => setTaskModal(task)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {tab === 'list' && (
        <div className="task-table-wrap card">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <TaskBigIcon />
              <h3>No tasks yet</h3>
              {isAdmin && <p>Create your first task to get started</p>}
            </div>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} className="task-table-row" onClick={() => setTaskModal(task)}>
                    <td className="task-table-title">
                      <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
                      {task.title}
                    </td>
                    <td>{task.assigned_to_name || <span className="unassigned">Unassigned</span>}</td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td className={task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' ? 'overdue-text' : ''}>
                      {task.due_date ? formatDate(task.due_date) : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {(isAdmin || task.assigned_to === user.id) && (
                        <select className="status-select" value={task.status}
                          onChange={e => handleStatusChange(task, e.target.value)}>
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          task={taskModal === 'create' ? null : taskModal}
          members={members}
          isAdmin={isAdmin}
          currentUserId={user.id}
          onClose={() => setTaskModal(null)}
          onCreate={handleCreateTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <MembersModal
          projectId={projectId}
          members={members}
          isAdmin={isAdmin}
          currentUserId={user.id}
          onClose={() => setShowMembersModal(false)}
          onRefresh={fetchAll}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          project={project}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (data) => {
            const r = await api.put(`/projects/${projectId}`, data);
            setProject(p => ({ ...p, ...r.data.project }));
            setShowSettingsModal(false);
            addToast('Project updated!');
          }}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  );
}

function TaskCard({ task, isAdmin, currentUserId, onOpen, onStatusChange }) {
  const canEdit = isAdmin || task.assigned_to === currentUserId;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className={`kanban-card ${isOverdue ? 'overdue-card' : ''}`} onClick={onOpen}>
      <div className="kc-priority" style={{ background: PRIORITY_COLORS[task.priority] }} />
      <div className="kc-body">
        <p className="kc-title">{task.title}</p>
        {task.description && <p className="kc-desc">{task.description}</p>}
        <div className="kc-footer">
          <div className="kc-footer-left">
            {task.assigned_to_name ? (
              <div className="kc-assignee">
                <div className="avatar" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>
                  {task.assigned_to_name[0].toUpperCase()}
                </div>
                <span>{task.assigned_to_name}</span>
              </div>
            ) : (
              <span className="unassigned">Unassigned</span>
            )}
          </div>
          <div className="kc-footer-right">
            {task.due_date && (
              <span className={`kc-due ${isOverdue ? 'overdue' : ''}`}>{formatDate(task.due_date)}</span>
            )}
            <span className={`badge badge-${task.priority} badge-xs`}>{task.priority}</span>
          </div>
        </div>
        {canEdit && (
          <div className="kc-actions" onClick={e => e.stopPropagation()}>
            {task.status !== 'todo' && (
              <button className="kc-action-btn" onClick={() => onStatusChange(task, task.status === 'done' ? 'in_progress' : 'todo')}>
                ← Back
              </button>
            )}
            {task.status !== 'done' && (
              <button className="kc-action-btn primary" onClick={() => onStatusChange(task, task.status === 'todo' ? 'in_progress' : 'done')}>
                {task.status === 'todo' ? 'Start →' : 'Done ✓'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MembersModal({ projectId, members, isAdmin, currentUserId, onClose, onRefresh }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email, role });
      setEmail('');
      onRefresh();
      addToast('Member added!');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      onRefresh();
      addToast('Member removed');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/projects/${projectId}/members/${userId}`, { role: newRole });
      onRefresh();
      addToast('Role updated');
    } catch (err) {
      addToast('Failed to update role', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Manage Members</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>

        {isAdmin && (
          <form onSubmit={handleAdd} className="add-member-form">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" required />
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: 'auto', flexShrink: 0 }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? '...' : 'Add'}
            </button>
          </form>
        )}

        <div className="members-list">
          {members.map(m => (
            <div key={m.id} className="member-row">
              <div className="avatar avatar-sm">{m.name[0].toUpperCase()}</div>
              <div className="member-info">
                <span className="member-name">{m.name} {m.id === currentUserId && '(you)'}</span>
                <span className="member-email">{m.email}</span>
              </div>
              {isAdmin && m.id !== currentUserId ? (
                <>
                  <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)}
                    style={{ width: 'auto', flexShrink: 0, fontSize: '0.8rem', padding: '6px 10px' }}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemove(m.id)}>Remove</button>
                </>
              ) : (
                <span className={`badge badge-${m.role}`}>{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ project, onClose, onSave, onDelete }) {
  const COLORS = ['#7c6bff','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316'];
  const [form, setForm] = useState({ name: project.name, description: project.description || '', color: project.color });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Project Settings</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button" className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Delete Project</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Save Changes'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>; }
function CloseIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>; }
function PersonIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>; }
function GearIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>; }
function TaskBigIcon() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" strokeLinecap="round" /></svg>; }
