require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db');
const { email, password, text } = require('../lib/validation');

async function seedAdmin() {
  const name = text(process.env.ADMIN_NAME || 'Library Administrator', 'Admin name', 120);
  const adminEmail = email(process.env.ADMIN_EMAIL || 'admin@library.local');
  const adminPassword = password(process.env.ADMIN_PASSWORD || '');
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin'`,
    [name, adminEmail, passwordHash]
  );
  console.log(`Admin account ready: ${adminEmail}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Could not create the admin account:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
