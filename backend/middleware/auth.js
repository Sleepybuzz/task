const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key_2024';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireProjectRole(...roles) {
  return (req, res, next) => {
    const db = getDb();
    const projectId = req.params.projectId || req.body.project_id;
    const member = db.prepare(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(projectId, req.user.id);
    if (!member) return res.status(403).json({ error: 'Not a project member' });
    if (roles.length && !roles.includes(member.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    req.projectRole = member.role;
    next();
  };
}

module.exports = { authenticate, requireProjectRole, JWT_SECRET };
