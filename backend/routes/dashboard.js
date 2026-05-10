const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // Get all project IDs the user is a member of
  const myProjects = db.prepare(
    'SELECT project_id, role FROM project_members WHERE user_id = ?'
  ).all(userId);
  const projectIds = myProjects.map(p => p.project_id);

  if (projectIds.length === 0) {
    return res.json({
      stats: { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 },
      tasksByProject: [],
      tasksByUser: [],
      recentTasks: [],
      myTasks: []
    });
  }

  const placeholders = projectIds.map(() => '?').join(',');

  // Overall stats across all user's projects
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN due_date < ? AND status != 'done' THEN 1 ELSE 0 END) AS overdue
    FROM tasks WHERE project_id IN (${placeholders})
  `).get(today, ...projectIds);

  // Tasks per project
  const tasksByProject = db.prepare(`
    SELECT p.id, p.name, p.color,
      COUNT(t.id) AS total,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id IN (${placeholders})
    GROUP BY p.id
  `).all(...projectIds);

  // Tasks per user
  const tasksByUser = db.prepare(`
    SELECT u.id, u.name, u.email,
      COUNT(t.id) AS total,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done
    FROM users u
    JOIN tasks t ON t.assigned_to = u.id
    WHERE t.project_id IN (${placeholders})
    GROUP BY u.id
    ORDER BY total DESC
    LIMIT 10
  `).all(...projectIds);

  // Recent tasks
  const recentTasks = db.prepare(`
    SELECT t.*, p.name AS project_name, p.color AS project_color,
      u.name AS assigned_to_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.project_id IN (${placeholders})
    ORDER BY t.updated_at DESC LIMIT 8
  `).all(...projectIds);

  // My assigned tasks
  const myTasks = db.prepare(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assigned_to = ? AND t.status != 'done'
    ORDER BY CASE WHEN t.due_date < ? THEN 0 ELSE 1 END,
      CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      t.due_date ASC NULLS LAST
    LIMIT 6
  `).all(userId, today);

  res.json({ stats, tasksByProject, tasksByUser, recentTasks, myTasks });
});

module.exports = router;
