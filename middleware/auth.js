const pool = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  pool.execute(
    'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
    [req.session.user.id]
  ).then(([users]) => {
    if (!users.length) {
      req.session.user = null;
      return res.status(401).json({ error: 'This account is no longer active. Please log in again.' });
    }
    req.session.user = {
      id: users[0].user_id,
      name: users[0].name,
      email: users[0].email,
      role: users[0].role
    };
    next();
  }).catch(next);
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, (error) => {
    if (error) return next(error);
    if (res.headersSent) return;
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access is required.' });
    }
    next();
  });
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const token = req.get('X-CSRF-Token');
  const expected = req.session.csrfToken;
  if (!token || !expected || token !== expected) {
    return res.status(403).json({ error: 'Your session token is invalid. Refresh the page and try again.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireCsrf };
