# Greenleaf-Library

A responsive library application built with vanilla HTML, CSS, and JavaScript, Express, and MySQL. Members can browse, borrow, reserve, and track books. Librarians can manage the catalog and categories, issue and return books, and review member and overdue reports.

## Project structure

```text
dbms/
├── database/
│   ├── library.sql
│   └── migrations/
│       └── 001_add_user_phone.sql
├── lib/
│   ├── async-handler.js
│   └── validation.js
├── middleware/
│   ├── auth.js
│   └── mysql-session-store.js
├── public/
│   ├── css/styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── admin-dashboard.js
│   │   ├── catalog.js
│   │   ├── issue-return.js
│   │   ├── login.js
│   │   ├── manage-books.js
│   │   ├── my-books.js
│   │   ├── profile.js
│   │   └── register.js
│   ├── admin-dashboard.html
│   ├── catalog.html
│   ├── issue-return.html
│   ├── login.html
│   ├── manage-books.html
│   ├── my-books.html
│   ├── profile.html
│   └── register.html
├── routes/
│   ├── admin.js
│   ├── auth.js
│   ├── books.js
│   └── issues.js
├── scripts/
│   └── seed-admin.js
├── test/
│   └── validation.test.js
├── .env.example
├── .gitignore
├── db.js
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Requirements

- Node.js 20 or newer and npm
- MySQL 8.0 or newer

## Install and run locally (Windows PowerShell)

1. Install MySQL Community Server (the MySQL Installer for Windows is available at [dev.mysql.com/downloads/installer](https://dev.mysql.com/downloads/installer)). Configure it as a Windows service on port `3306` and set a root password. Start the MySQL service, then open MySQL Workbench or a PowerShell terminal where the MySQL `bin` directory is on `PATH`.

2. Create the database and tables by running the SQL script from a MySQL account that can create databases:

   ```powershell
   Get-Content database\library.sql | mysql -u root -p
   ```

   The script creates `online_library`, its tables, sample categories, sample books, and the default administrator account (`admin@library.local` / `Admin123!`). MySQL 8.0.16 or newer enforces the declared `CHECK` constraints.

   For a dedicated application account, run these commands in MySQL after importing the script (replace the example password with a strong, unique value):

   ```sql
   CREATE USER 'library_app'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
   GRANT SELECT, INSERT, UPDATE, DELETE
   ON online_library.* TO 'library_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. Install the Node dependencies:

   ```powershell
   npm install
   ```

4. Create the local environment file and edit it with your MySQL credentials:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to the credentials for the account you set up above. The SQL script creates the MySQL-backed session table along with the library tables, and sessions share the same database pool. The MySQL root account can also be used for local development.

   Change `SESSION_SECRET` to a private random value of at least 32 characters. For example, generate one with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

   Put the generated value in `.env`; do not commit `.env`.

5. Create or update the default administrator account:

   ```powershell
   npm run seed:admin
   ```

   By default the account is `admin@library.local` with password `Admin123!`. Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before seeding if needed. The password is stored as a bcrypt hash.

6. Start the server:

   ```powershell
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000) to browse the catalog. Use `npm run dev` while developing to restart the server when source files change.

## Notes

- Public account registration always creates a `member`; admin privileges are never accepted from the registration form. Name, email, and phone number are required during registration and when updating the profile. Existing users should fill in their phone number on the profile page.
- Session cookies are HTTP-only and same-site. Mutating API requests require a session CSRF token, and login / registration endpoints are rate-limited.
- All SQL values are passed through mysql2 prepared statements. Book issue and return operations use transactions and row locks to keep stock counts consistent.
- Loans are due 14 days after issue. On return the fine is calculated as Rs. 2 per overdue calendar day. Current overdue estimates are shown in member and admin dashboards; fines become final when returned.
- If a returned book has a pending reservation, the next reservation is fulfilled automatically and that copy is issued to the member.
- The session cookie is marked `Secure` when `NODE_ENV=production`; serve the production application over HTTPS.
- Run the input validation unit tests with `npm test`.
