const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();

// Get all projects for current user
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, pm.role AS my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS task_count,
      u.name AS creator_name
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.created_by
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json({ projects });
});

// Create project
router.post('/', authenticate, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO projects (name, description, color, created_by) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), description || '', color || '#6366f1', req.user.id);

  // Creator becomes admin
  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project: { ...project, my_role: 'admin' } });
});

// Get single project
router.get('/:projectId', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, pm.role AS my_role, u.name AS creator_name
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
  `).get(req.user.id, req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, u.name ASC
  `).all(req.params.projectId);

  res.json({ project, members });
});

// Update project (admin only)
router.put('/:projectId', authenticate, requireProjectRole('admin'), (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  const db = getDb();
  db.prepare(
    'UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?'
  ).run(name.trim(), description || '', color || '#6366f1', req.params.projectId);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  res.json({ project });
});

// Delete project (admin only)
router.delete('/:projectId', authenticate, requireProjectRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// Add member (admin only)
router.post('/:projectId/members', authenticate, requireProjectRole('admin'), (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = getDb();
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(req.params.projectId, user.id, role === 'admin' ? 'admin' : 'member');

  res.status(201).json({ member: { ...user, role: role === 'admin' ? 'admin' : 'member' } });
});

// Remove member (admin only)
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole('admin'), (req, res) => {
  const db = getDb();
  if (parseInt(req.params.userId) === req.user.id)
    return res.status(400).json({ error: 'Cannot remove yourself from the project' });
  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

// Update member role (admin only)
router.put('/:projectId/members/:userId', authenticate, requireProjectRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  const db = getDb();
  db.prepare(
    'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?'
  ).run(role, req.params.projectId, req.params.userId);
  res.json({ message: 'Role updated' });
});

module.exports = router;
