USE online_library;

ALTER TABLE users
  ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER email;
