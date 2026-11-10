const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const pool = require('../db');
const asyncHandler = require('../lib/async-handler');
const { requireAuth } = require('../middleware/auth');
const { email, password, phone, text } = require('../lib/validation');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
  const name = text(req.body.name, 'Name', 120);
  const userEmail = email(req.body.email);
  const userPhone = phone(req.body.phone, true);
  const userPassword = password(req.body.password);
  const passwordHash = await bcrypt.hash(userPassword, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [name, userEmail, userPhone, passwordHash, 'member']
  );
  res.status(201).json({ message: 'Your account has been created. You can now log in.', userId: result.insertId });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const userEmail = email(req.body.email);
  if (typeof req.body.password !== 'string' || req.body.password.length > 72) {
    return res.status(400).json({ error: 'Enter a valid email address and password.' });
  }
  const [users] = await pool.execute(
    'SELECT user_id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [userEmail]
  );
  const user = users[0];
  const matches = user
    ? await bcrypt.compare(req.body.password, user.password_hash)
    : await bcrypt.compare(req.body.password, '$2b$12$/foT0CgEcEuURyZpn9s87ePFnoVb.FybDIzXM0BM.Wc10BBxLAat6');
  if (!user || !matches) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.user = {
    id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
  res.clearCookie('library.sid', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'You have been logged out.' });
}));

router.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  const [users] = await pool.execute(
    'SELECT name, email, phone, role, created_at FROM users WHERE user_id = ?',
    [req.session.user.id]
  );
  res.json({ profile: users[0] });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const name = text(req.body.name, 'Name', 120);
  const userEmail = email(req.body.email);
  const userPhone = phone(req.body.phone, true);
  await pool.execute(
    'UPDATE users SET name = ?, email = ?, phone = ? WHERE user_id = ?',
    [name, userEmail, userPhone, req.session.user.id]
  );
  req.session.user.name = name;
  req.session.user.email = userEmail;
  res.json({ message: 'Your account details have been updated.', user: req.session.user });
}));

router.post('/password', requireAuth, asyncHandler(async (req, res) => {
  const currentPassword = req.body.currentPassword;
  if (typeof currentPassword !== 'string' || Buffer.byteLength(currentPassword, 'utf8') > 72) {
    return res.status(400).json({ error: 'Enter your current password.' });
  }
  const newPassword = password(req.body.newPassword);
  const [users] = await pool.execute(
    'SELECT password_hash FROM users WHERE user_id = ?',
    [req.session.user.id]
  );
  if (!await bcrypt.compare(currentPassword, users[0].password_hash)) {
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.execute(
    'UPDATE users SET password_hash = ? WHERE user_id = ?',
    [passwordHash, req.session.user.id]
  );
  res.json({ message: 'Your password has been changed.' });
}));

module.exports = router;
