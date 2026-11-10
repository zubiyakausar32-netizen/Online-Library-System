const express = require('express');
const pool = require('../db');
const asyncHandler = require('../lib/async-handler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { id } = require('../lib/validation');

const router = express.Router();

async function issueBook(connection, userId, bookId) {
  const [books] = await connection.execute(
    'SELECT available_copies FROM books WHERE book_id = ? FOR UPDATE',
    [bookId]
  );
  if (!books.length) {
    const error = new Error('Book not found.');
    error.status = 404;
    throw error;
  }
  const [active] = await connection.execute(
    'SELECT issue_id FROM issues WHERE user_id = ? AND book_id = ? AND return_date IS NULL LIMIT 1 FOR UPDATE',
    [userId, bookId]
  );
  if (active.length) {
    const error = new Error('This member already has this book checked out.');
    error.status = 409;
    throw error;
  }
  if (books[0].available_copies < 1) {
    const error = new Error('No copies of this book are currently available.');
    error.status = 409;
    throw error;
  }
  const [reservations] = await connection.execute(
    `SELECT reservation_id, user_id FROM reservations
     WHERE book_id = ? AND status = 'pending'
     ORDER BY reserved_at, reservation_id LIMIT 1 FOR UPDATE`,
    [bookId]
  );
  if (reservations.length && reservations[0].user_id !== userId) {
    const error = new Error('This book has an earlier reservation. Issue it to the next member in the queue first.');
    error.status = 409;
    throw error;
  }
  await connection.execute(
    `INSERT INTO issues (user_id, book_id, issue_date, due_date)
     VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))`,
    [userId, bookId]
  );
  if (reservations.length) {
    await connection.execute(
      `UPDATE reservations SET status = 'fulfilled' WHERE reservation_id = ?`,
      [reservations[0].reservation_id]
    );
  }
  await connection.execute(
    'UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?',
    [bookId]
  );
}

router.post('/borrow', requireAuth, asyncHandler(async (req, res) => {
  const bookId = id(req.body.bookId, 'Book ID');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [books] = await connection.execute(
      'SELECT available_copies FROM books WHERE book_id = ? FOR UPDATE',
      [bookId]
    );
    if (!books.length) {
      const error = new Error('Book not found.');
      error.status = 404;
      throw error;
    }
    const [active] = await connection.execute(
      'SELECT issue_id FROM issues WHERE user_id = ? AND book_id = ? AND return_date IS NULL LIMIT 1 FOR UPDATE',
      [req.session.user.id, bookId]
    );
    const [pending] = await connection.execute(
      `SELECT reservation_id FROM reservations
       WHERE user_id = ? AND book_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE`,
      [req.session.user.id, bookId]
    );
    if (active.length || pending.length) {
      const error = new Error('You already have this book checked out or reserved.');
      error.status = 409;
      throw error;
    }
    const [queue] = await connection.execute(
      `SELECT reservation_id FROM reservations
       WHERE book_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE`,
      [bookId]
    );
    if (books[0].available_copies > 0 && !queue.length) {
      await issueBook(connection, req.session.user.id, bookId);
      await connection.commit();
      return res.status(201).json({ message: 'Book borrowed successfully. It is due in 14 days.', type: 'issue' });
    }
    await connection.execute(
      'INSERT INTO reservations (user_id, book_id) VALUES (?, ?)',
      [req.session.user.id, bookId]
    );
    await connection.commit();
    res.status(201).json({ message: 'The book is not available right now. You are in the reservation queue.', type: 'reservation' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const [issues] = await pool.execute(
    `SELECT i.issue_id, i.issue_date, i.due_date, i.return_date, i.fine,
            (i.return_date IS NULL AND i.due_date < CURDATE()) AS is_overdue,
            b.book_id, b.title, b.author,
            CASE WHEN i.return_date IS NULL AND i.due_date < CURDATE()
              THEN DATEDIFF(CURDATE(), i.due_date) * 2 ELSE 0 END AS accrued_fine
     FROM issues i JOIN books b ON b.book_id = i.book_id
     WHERE i.user_id = ? ORDER BY i.issue_date DESC, i.issue_id DESC`,
    [req.session.user.id]
  );
  const [reservations] = await pool.execute(
    `SELECT r.reservation_id, r.reserved_at, r.status, b.title, b.author
     FROM reservations r JOIN books b ON b.book_id = r.book_id
     WHERE r.user_id = ? AND r.status = 'pending' ORDER BY r.reserved_at`,
    [req.session.user.id]
  );
  res.json({ issues, reservations });
}));

router.get('/open', requireAdmin, asyncHandler(async (req, res) => {
  const [issues] = await pool.execute(
    `SELECT i.issue_id, i.issue_date, i.due_date, (i.due_date < CURDATE()) AS is_overdue,
            u.user_id, u.name AS member_name,
            u.email, b.book_id, b.title, b.author
     FROM issues i JOIN users u ON u.user_id = i.user_id
     JOIN books b ON b.book_id = i.book_id
     WHERE i.return_date IS NULL ORDER BY i.due_date, i.issue_date`
  );
  const [members] = await pool.execute(
    `SELECT user_id, name, email FROM users WHERE role = 'member' ORDER BY name`
  );
  const [books] = await pool.execute(
    `SELECT book_id, title, author, available_copies FROM books ORDER BY title`
  );
  res.json({ issues, members, books });
}));

router.post('/admin-issue', requireAdmin, asyncHandler(async (req, res) => {
  const userId = id(req.body.userId, 'Member');
  const bookId = id(req.body.bookId, 'Book');
  const [members] = await pool.execute(
    `SELECT user_id FROM users WHERE user_id = ? AND role = 'member'`,
    [userId]
  );
  if (!members.length) return res.status(404).json({ error: 'Member not found.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await issueBook(connection, userId, bookId);
    await connection.commit();
    res.status(201).json({ message: 'Book issued successfully. The due date is 14 days from today.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.post('/:issueId/return', requireAdmin, asyncHandler(async (req, res) => {
  const issueId = id(req.params.issueId, 'Issue ID');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [issueReferences] = await connection.execute(
      'SELECT book_id FROM issues WHERE issue_id = ?',
      [issueId]
    );
    if (!issueReferences.length) {
      const error = new Error('Active issue not found. It may already have been returned.');
      error.status = 404;
      throw error;
    }
    await connection.execute('SELECT book_id FROM books WHERE book_id = ? FOR UPDATE', [issueReferences[0].book_id]);
    const [issues] = await connection.execute(
      `SELECT issue_id, book_id, due_date FROM issues
       WHERE issue_id = ? AND return_date IS NULL FOR UPDATE`,
      [issueId]
    );
    if (!issues.length) {
      const error = new Error('Active issue not found. It may already have been returned.');
      error.status = 404;
      throw error;
    }
    const issue = issues[0];
    const [reservations] = await connection.execute(
      `SELECT reservation_id, user_id FROM reservations
       WHERE book_id = ? AND status = 'pending'
       ORDER BY reserved_at, reservation_id LIMIT 1 FOR UPDATE`,
      [issue.book_id]
    );
    await connection.execute(
      `UPDATE issues SET return_date = CURDATE(),
       fine = GREATEST(DATEDIFF(CURDATE(), due_date), 0) * 2
       WHERE issue_id = ?`,
      [issueId]
    );
    let reservationFulfilled = false;
    if (reservations.length) {
      await connection.execute(
        `UPDATE reservations SET status = 'fulfilled' WHERE reservation_id = ?`,
        [reservations[0].reservation_id]
      );
      await connection.execute(
        `INSERT INTO issues (user_id, book_id, issue_date, due_date)
         VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))`,
        [reservations[0].user_id, issue.book_id]
      );
      reservationFulfilled = true;
    } else {
      await connection.execute(
        'UPDATE books SET available_copies = available_copies + 1 WHERE book_id = ?',
        [issue.book_id]
      );
    }
    await connection.commit();
    res.json({
      message: reservationFulfilled
        ? 'Book returned. It was immediately issued to the next member in the reservation queue.'
        : 'Book returned successfully.',
      reservationFulfilled
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

module.exports = router;
