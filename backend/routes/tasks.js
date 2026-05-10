const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Get all tasks for a project
router.get('/', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*,
      u1.name AS assigned_to_name, u1.email AS assigned_to_email,
      u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assigned_to
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.project_id = ?
    ORDER BY
      CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
  `).all(req.params.projectId);
  res.json({ tasks });
});

// Create task (admin only)
router.post('/', authenticate, requireProjectRole('admin'), (req, res) => {
  const { title, description, assigned_to, status, priority, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const db = getDb();

  // Validate assigned_to is a project member
  if (assigned_to) {
    const member = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assigned_to);
    if (!member) return res.status(400).json({ error: 'Assigned user is not a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description || '',
    req.params.projectId,
    assigned_to || null,
    req.user.id,
    status || 'todo',
    priority || 'medium',
    due_date || null
  );

  const task = db.prepare(`
    SELECT t.*, u1.name AS assigned_to_name, u1.email AS assigned_to_email, u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assigned_to
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// Get single task
router.get('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, u1.name AS assigned_to_name, u1.email AS assigned_to_email, u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assigned_to
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

// Update task
router.put('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update status of their assigned tasks
  if (req.projectRole === 'member') {
    if (task.assigned_to !== req.user.id)
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.taskId);
  } else {
    // Admin can update everything
    const { title, description, assigned_to, status, priority, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    if (assigned_to) {
      const member = db.prepare(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.projectId, assigned_to);
      if (!member) return res.status(400).json({ error: 'Assigned user is not a project member' });
    }

    db.prepare(`
      UPDATE tasks SET title = ?, description = ?, assigned_to = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(), description || '', assigned_to || null,
      status || 'todo', priority || 'medium', due_date || null,
      req.params.taskId
    );
  }

  const updated = db.prepare(`
    SELECT t.*, u1.name AS assigned_to_name, u1.email AS assigned_to_email, u2.name AS created_by_name
    FROM tasks t LEFT JOIN users u1 ON u1.id = t.assigned_to LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ?
  `).get(req.params.taskId);
  res.json({ task: updated });
});

// Delete task (admin only)
router.delete('/:taskId', authenticate, requireProjectRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?')
    .run(req.params.taskId, req.params.projectId);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
