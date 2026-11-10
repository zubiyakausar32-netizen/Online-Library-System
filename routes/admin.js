const express = require('express');
const pool = require('../db');
const asyncHandler = require('../lib/async-handler');
const { requireAdmin } = require('../middleware/auth');
const { id, isbn, positiveInteger, text } = require('../lib/validation');

const router = express.Router();
router.use(requireAdmin);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [[bookTotals]] = await pool.execute(
    'SELECT COUNT(*) AS title_count, COALESCE(SUM(total_copies), 0) AS copy_count FROM books'
  );
  const [[memberTotals]] = await pool.execute(
    `SELECT COUNT(*) AS member_count FROM users WHERE role = 'member'`
  );
  const [[todayTotals]] = await pool.execute(
    'SELECT COUNT(*) AS issued_today FROM issues WHERE issue_date = CURDATE()'
  );
  const [[overdueTotals]] = await pool.execute(
    'SELECT COUNT(*) AS overdue_count FROM issues WHERE return_date IS NULL AND due_date < CURDATE()'
  );
  const [overdue] = await pool.execute(
    `SELECT i.issue_id, i.due_date, DATEDIFF(CURDATE(), i.due_date) AS days_overdue,
            u.name AS member_name, u.email, b.title, b.author,
            DATEDIFF(CURDATE(), i.due_date) * 2 AS estimated_fine
     FROM issues i JOIN users u ON u.user_id = i.user_id
     JOIN books b ON b.book_id = i.book_id
     WHERE i.return_date IS NULL AND i.due_date < CURDATE()
     ORDER BY i.due_date, u.name LIMIT 100`
  );
  const [categories] = await pool.execute(
    'SELECT category_id, category_name FROM categories ORDER BY category_name'
  );
  res.json({
    metrics: {
      titles: bookTotals.title_count,
      copies: bookTotals.copy_count,
      members: memberTotals.member_count,
      issuedToday: todayTotals.issued_today,
      overdue: overdueTotals.overdue_count
    },
    overdue,
    categories
  });
}));

router.get('/members', asyncHandler(async (req, res) => {
  const [members] = await pool.execute(
    `SELECT u.user_id, u.name, u.email, u.created_at,
      (SELECT COUNT(*) FROM issues i WHERE i.user_id = u.user_id AND i.return_date IS NULL) AS active_loans
     FROM users u WHERE u.role = 'member' ORDER BY u.name`
  );
  res.json({ members });
}));

router.delete('/members/:memberId', asyncHandler(async (req, res) => {
  const memberId = id(req.params.memberId, 'Member ID');
  const [result] = await pool.execute(
    `DELETE FROM users WHERE user_id = ? AND role = 'member'`,
    [memberId]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Member not found.' });
  res.json({ message: 'Member account removed.' });
}));

router.post('/books', asyncHandler(async (req, res) => {
  const title = text(req.body.title, 'Title', 255);
  const author = text(req.body.author, 'Author', 180);
  const bookIsbn = isbn(req.body.isbn);
  const categoryId = id(req.body.categoryId, 'Category');
  const totalCopies = positiveInteger(req.body.totalCopies, 'Total copies', 100000);
  const [result] = await pool.execute(
    `INSERT INTO books (title, author, isbn, category_id, total_copies, available_copies)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, author, bookIsbn, categoryId, totalCopies, totalCopies]
  );
  res.status(201).json({ message: 'Book added to the catalog.', bookId: result.insertId });
}));

router.put('/books/:bookId', asyncHandler(async (req, res) => {
  const bookId = id(req.params.bookId, 'Book ID');
  const title = text(req.body.title, 'Title', 255);
  const author = text(req.body.author, 'Author', 180);
  const bookIsbn = isbn(req.body.isbn);
  const categoryId = id(req.body.categoryId, 'Category');
  const totalCopies = positiveInteger(req.body.totalCopies, 'Total copies', 100000);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [books] = await connection.execute(
      'SELECT total_copies, available_copies FROM books WHERE book_id = ? FOR UPDATE',
      [bookId]
    );
    if (!books.length) {
      const error = new Error('Book not found.');
      error.status = 404;
      throw error;
    }
    const checkedOut = books[0].total_copies - books[0].available_copies;
    if (totalCopies < checkedOut) {
      const error = new Error(`Total copies cannot be lower than the ${checkedOut} copies currently checked out.`);
      error.status = 400;
      throw error;
    }
    await connection.execute(
      `UPDATE books SET title = ?, author = ?, isbn = ?, category_id = ?,
       total_copies = ?, available_copies = ? WHERE book_id = ?`,
      [title, author, bookIsbn, categoryId, totalCopies, totalCopies - checkedOut, bookId]
    );
    await connection.commit();
    res.json({ message: 'Book details updated.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.delete('/books/:bookId', asyncHandler(async (req, res) => {
  const bookId = id(req.params.bookId, 'Book ID');
  const [result] = await pool.execute('DELETE FROM books WHERE book_id = ?', [bookId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Book not found.' });
  res.json({ message: 'Book removed from the catalog.' });
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const categoryName = text(req.body.categoryName, 'Category name', 100);
  const [result] = await pool.execute(
    'INSERT INTO categories (category_name) VALUES (?)',
    [categoryName]
  );
  res.status(201).json({ message: 'Category added.', categoryId: result.insertId });
}));

router.delete('/categories/:categoryId', asyncHandler(async (req, res) => {
  const categoryId = id(req.params.categoryId, 'Category ID');
  const [result] = await pool.execute('DELETE FROM categories WHERE category_id = ?', [categoryId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Category not found.' });
  res.json({ message: 'Category deleted.' });
}));

module.exports = router;
