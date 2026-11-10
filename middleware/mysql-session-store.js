const session = require('express-session');
const pool = require('../db');

class MySQLSessionStore extends session.Store {
  get(sessionId, callback) {
    pool.execute('SELECT expires, data FROM sessions WHERE session_id = ?', [sessionId])
      .then(async ([rows]) => {
        if (!rows.length) return callback(null, null);
        if (rows[0].expires <= Date.now()) {
          await pool.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
          return callback(null, null);
        }
        callback(null, JSON.parse(rows[0].data));
      })
      .catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + Number(sessionData.cookie?.maxAge || 0);
    pool.execute(
      `INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
      [sessionId, expires, JSON.stringify(sessionData)]
    ).then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + Number(sessionData.cookie?.maxAge || 0);
    pool.execute('UPDATE sessions SET expires = ? WHERE session_id = ?', [expires, sessionId])
      .then(() => callback(null)).catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    pool.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId])
      .then(() => callback(null)).catch(callback);
  }

  clear(callback = () => {}) {
    pool.execute('DELETE FROM sessions').then(() => callback(null)).catch(callback);
  }

  length(callback) {
    pool.execute('SELECT COUNT(*) AS count FROM sessions')
      .then(([rows]) => callback(null, Number(rows[0].count)))
      .catch(callback);
  }

  all(callback) {
    pool.execute('SELECT data FROM sessions WHERE expires > ?', [Date.now()])
      .then(([rows]) => callback(null, rows.map((row) => JSON.parse(row.data))))
      .catch(callback);
  }

  async prune() {
    await pool.execute('DELETE FROM sessions WHERE expires <= ?', [Date.now()]);
  }
}

module.exports = MySQLSessionStore;
