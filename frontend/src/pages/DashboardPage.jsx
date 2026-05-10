import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, parseISO, isPast } from 'date-fns';
import './DashboardPage.css';

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_COLORS = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--text-3)' };

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (!data) return <div className="page-content"><p>Failed to load dashboard.</p></div>;

  const { stats, tasksByProject, tasksByUser, recentTasks, myTasks } = data;

  return (
    <div className="page-content dashboard">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <StatCard label="Total Tasks" value={stats.total} icon="📋" color="var(--accent)" />
        <StatCard label="To Do" value={stats.todo} icon="○" color="var(--text-2)" />
        <StatCard label="In Progress" value={stats.in_progress} icon="◑" color="var(--blue)" />
        <StatCard label="Completed" value={stats.done} icon="●" color="var(--green)" />
        <StatCard label="Overdue" value={stats.overdue} icon="⚠" color="var(--red)" urgent={stats.overdue > 0} />
      </div>

      <div className="dash-grid">
        {/* My Tasks */}
        <section className="card dash-section">
          <h3 className="section-title">My Open Tasks</h3>
          {myTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <span style={{ fontSize: '2rem' }}>🎉</span>
              <p>No open tasks assigned to you!</p>
            </div>
          ) : (
            <div className="task-list">
              {myTasks.map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}`} className="task-row">
                  <div className="task-row-left">
                    <span className="priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
                    <div>
                      <span className="task-title-sm">{task.title}</span>
                      <span className="task-project-label" style={{ background: task.project_color + '22', color: task.project_color }}>
                        {task.project_name}
                      </span>
                    </div>
                  </div>
                  <div className="task-row-right">
                    <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                    {task.due_date && (
                      <span className={`due-date ${isPast(new Date(task.due_date)) ? 'overdue' : ''}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Project Progress */}
        <section className="card dash-section">
          <h3 className="section-title">Project Progress</h3>
          {tasksByProject.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <p>No projects yet.</p>
              <Link to="/projects" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>Create Project</Link>
            </div>
          ) : (
            <div className="project-progress-list">
              {tasksByProject.map(p => {
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="project-progress-row">
                    <div className="pp-header">
                      <span className="pp-dot" style={{ background: p.color }} />
                      <span className="pp-name">{p.name}</span>
                      <span className="pp-pct">{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <div className="pp-counts">
                      <span>{p.todo} to do</span>
                      <span>{p.in_progress} in progress</span>
                      <span>{p.done} done</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Tasks by User */}
        {tasksByUser.length > 0 && (
          <section className="card dash-section">
            <h3 className="section-title">Team Workload</h3>
            <div className="workload-list">
              {tasksByUser.map(u => {
                const pct = u.total > 0 ? Math.round((u.done / u.total) * 100) : 0;
                return (
                  <div key={u.id} className="workload-row">
                    <div className="avatar avatar-sm">{u.name[0].toUpperCase()}</div>
                    <div className="workload-info">
                      <div className="workload-name-row">
                        <span>{u.name}</span>
                        <span className="workload-count">{u.total} tasks</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {recentTasks.length > 0 && (
          <section className="card dash-section">
            <h3 className="section-title">Recent Activity</h3>
            <div className="activity-list">
              {recentTasks.map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}`} className="activity-row">
                  <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  <div className="activity-info">
                    <span className="activity-title">{task.title}</span>
                    <span className="activity-meta">
                      {task.project_name} · {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, urgent }) {
  return (
    <div className={`stat-card card ${urgent ? 'urgent' : ''}`}>
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}
