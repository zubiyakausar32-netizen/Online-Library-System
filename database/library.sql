CREATE DATABASE IF NOT EXISTS online_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE online_library;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (category_name),
  CONSTRAINT chk_categories_name CHECK (CHAR_LENGTH(TRIM(category_name)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
  book_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(180) NOT NULL,
  isbn VARCHAR(20) NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  total_copies INT UNSIGNED NOT NULL DEFAULT 1,
  available_copies INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (book_id),
  UNIQUE KEY uq_books_isbn (isbn),
  KEY idx_books_category (category_id),
  KEY idx_books_title_author (title, author),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id)
    REFERENCES categories (category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_books_copies CHECK (available_copies <= total_copies),
  CONSTRAINT chk_books_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_books_author CHECK (CHAR_LENGTH(TRIM(author)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS issues (
  issue_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE DEFAULT NULL,
  fine DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (issue_id),
  KEY idx_issues_user_active (user_id, return_date),
  KEY idx_issues_book_active (book_id, return_date),
  KEY idx_issues_due_return (due_date, return_date),
  CONSTRAINT fk_issues_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_issues_book FOREIGN KEY (book_id)
    REFERENCES books (book_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_issues_dates CHECK (due_date >= issue_date),
  CONSTRAINT chk_issues_fine CHECK (fine >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (reservation_id),
  KEY idx_reservations_queue (book_id, status, reserved_at),
  KEY idx_reservations_user (user_id, status),
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_reservations_book FOREIGN KEY (book_id)
    REFERENCES books (book_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires BIGINT UNSIGNED NOT NULL,
  data MEDIUMTEXT NOT NULL,
  PRIMARY KEY (session_id),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB;

-- The password is Admin123! Change ADMIN_PASSWORD and run npm run seed:admin to replace it.
INSERT IGNORE INTO users (name, email, password_hash, role)
VALUES (
  'Library Administrator',
  'admin@library.local',
  '$2b$12$/foT0CgEcEuURyZpn9s87ePFnoVb.FybDIzXM0BM.Wc10BBxLAat6',
  'admin'
);

INSERT IGNORE INTO categories (category_name) VALUES
  ('Fiction'),
  ('Science'),
  ('History'),
  ('Technology'),
  ('Mathematics'),
  ('Biology');

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'Pride and Prejudice', 'Jane Austen', '9780141439518', category_id, 4, 4
FROM categories WHERE category_name = 'Fiction';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'A Brief History of Time', 'Stephen Hawking', '9780553380163', category_id, 3, 3
FROM categories WHERE category_name = 'Science';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Code Book', 'Simon Singh', '9780385495325', category_id, 2, 2
FROM categories WHERE category_name = 'Technology';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Hobbit', 'J.R.R. Tolkien', '9780547928227', category_id, 3, 3
FROM categories WHERE category_name = 'Fiction';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', category_id, 2, 2
FROM categories WHERE category_name = 'Fiction';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'Cosmos', 'Carl Sagan', '9780345539434', category_id, 2, 2
FROM categories WHERE category_name = 'Science';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Selfish Gene', 'Richard Dawkins', '9780198788607', category_id, 2, 2
FROM categories WHERE category_name = 'Science';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Silk Roads', 'Peter Frankopan', '9781408839997', category_id, 2, 2
FROM categories WHERE category_name = 'History';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'Clean Code', 'Robert C. Martin', '9780132350884', category_id, 2, 2
FROM categories WHERE category_name = 'Technology';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'How Not to Be Wrong: The Power of Mathematical Thinking', 'Jordan Ellenberg', '9780143127536', category_id, 2, 2
FROM categories WHERE category_name = 'Mathematics';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Joy of x: A Guided Tour of Math', 'Steven Strogatz', '9780547517650', category_id, 2, 2
FROM categories WHERE category_name = 'Mathematics';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'Calculus Made Easy', 'Silvanus P. Thompson', '9780486417133', category_id, 2, 2
FROM categories WHERE category_name = 'Mathematics';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Gene: An Intimate History', 'Siddhartha Mukherjee', '9781476733500', category_id, 2, 2
FROM categories WHERE category_name = 'Biology';

INSERT IGNORE INTO books (title, author, isbn, category_id, total_copies, available_copies)
SELECT 'The Immortal Life of Henrietta Lacks', 'Rebecca Skloot', '9781400052189', category_id, 2, 2
FROM categories WHERE category_name = 'Biology';
