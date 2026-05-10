import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import './ProjectsPage.css';

const COLORS = ['#7c6bff','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    api.get('/projects').then(r => { setProjects(r.data.projects); setLoading(false); });
  };

  const handleCreate = async (data) => {
    try {
      const r = await api.post('/projects', data);
      setProjects(p => [r.data.project, ...p]);
      setShowModal(false);
      addToast('Project created!');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create project', 'error');
    }
  };

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusIcon /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 64 }}>
          <FolderBigIcon />
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showModal && (
        <ProjectModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />
      )}
    </div>
  );
}

function ProjectCard({ project: p }) {
  const done = p.task_count > 0 ? 0 : 0; // approximate — full data on project page
  return (
    <Link to={`/projects/${p.id}`} className="project-card card">
      <div className="project-card-accent" style={{ background: p.color }} />
      <div className="project-card-body">
        <div className="project-card-header">
          <div className="project-icon" style={{ background: p.color + '22', color: p.color }}>
            {p.name[0].toUpperCase()}
          </div>
          <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
        </div>
        <h3 className="project-name">{p.name}</h3>
        {p.description && <p className="project-desc">{p.description}</p>}
        <div className="project-meta">
          <span className="meta-item">
            <PersonIcon /> {p.member_count} member{p.member_count !== 1 ? 's' : ''}
          </span>
          <span className="meta-item">
            <TaskIcon /> {p.task_count} task{p.task_count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="project-creator">by {p.creator_name}</div>
      </div>
    </Link>
  );
}

function ProjectModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#7c6bff' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Website Redesign" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this project..." rows={3} />
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>;
}
function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>;
}
function PersonIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
}
function TaskIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function FolderBigIcon() {
  return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>;
}
