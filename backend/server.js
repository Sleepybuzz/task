const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Initialize DB then mount routes
initDb().then(() => {
  const authRoutes = require('./routes/auth');
  const projectRoutes = require('./routes/projects');
  const taskRoutes = require('./routes/tasks');
  const dashboardRoutes = require('./routes/dashboard');

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/projects/:projectId/tasks', taskRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 TaskFlow API running on http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
