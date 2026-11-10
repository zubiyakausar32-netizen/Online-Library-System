const express = require('express');
const pool = require('../db');
const asyncHandler = require('../lib/async-handler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : '';
  const categoryId = req.query.category ? Number(req.query.category) : null;
  if (categoryId !== null && (!Number.isSafeInteger(categoryId) || categoryId < 1)) {
    return res.status(400).json({ error: 'Choose a valid category.' });
  }
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId !== null) {
    conditions.push('b.category_id = ?');
    params.push(categoryId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [books] = await pool.execute(
    `SELECT b.book_id, b.title, b.author, b.isbn, b.category_id,
            b.total_copies, b.available_copies, c.category_name
     FROM books b JOIN categories c ON c.category_id = b.category_id
     ${where} ORDER BY b.title ASC`,
    params
  );
  res.json({ books });
}));

router.get('/categories', asyncHandler(async (req, res) => {
  const [categories] = await pool.execute(
    'SELECT category_id, category_name FROM categories ORDER BY category_name'
  );
  res.json({ categories });
}));

module.exports = router;
