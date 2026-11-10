require('dotenv').config();

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const pool = require('./db');
const { requireAuth, requireCsrf } = require('./middleware/auth');
const MySQLSessionStore = require('./middleware/mysql-session-store');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' }
});

const app = express();
const port = Number(process.env.PORT || 3000);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters.');
}

const sessionStore = new MySQLSessionStore();
const sessionPruneTimer = setInterval(() => {
  sessionStore.prune().catch((error) => console.error('Could not prune expired sessions:', error.message));
}, 60 * 60 * 1000);
sessionPruneTimer.unref();

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)
    && (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }
  next();
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use(session({
  name: 'library.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.get('/api/auth/csrf', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.json({ csrfToken: req.session.csrfToken });
});

app.use('/api', requireCsrf);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', requireAuth, require('./routes/books'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');
  res.redirect(req.session.user.role === 'admin' ? '/admin-dashboard.html' : '/catalog.html');
});
app.get('/catalog.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'That email, ISBN, or category name is already in use.' });
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'This item is in use and cannot be deleted.' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Choose a valid category and book.' });
  }
  console.error(error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const server = app.listen(port, () => {
  console.log(`Online Library System listening at http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  clearInterval(sessionPruneTimer);
  await pool.end();
}

process.on('SIGINT', () => shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => shutdown().then(() => process.exit(0)));
