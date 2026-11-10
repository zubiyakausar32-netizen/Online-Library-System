let managedBooks = [];
let managedCategories = [];

async function refreshBooks() {
  const { books } = await LibraryApp.api('/api/books');
  managedBooks = books;
  document.getElementById('book-count').textContent = `${books.length} titles`;
  document.getElementById('book-rows').innerHTML = books.length ? books.map((book) =>
    `<tr>
      <td><span class="cell-title">${LibraryApp.escapeHtml(book.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(book.author)}</span></td>
      <td>${LibraryApp.escapeHtml(book.isbn)}</td><td>${LibraryApp.escapeHtml(book.category_name)}</td>
      <td>${book.available_copies} / ${book.total_copies}</td>
      <td><button class="button secondary small edit-book" type="button" data-book-id="${book.book_id}">Edit</button> <button class="button danger small delete-book" type="button" data-book-id="${book.book_id}">Delete</button></td>
    </tr>`
  ).join('') : '<tr><td colspan="5" class="empty-state">No books in the catalog yet.</td></tr>';
}

async function refreshCategories() {
  const { categories } = await LibraryApp.api('/api/books/categories');
  managedCategories = categories;
  const select = document.getElementById('book-category');
  select.innerHTML = categories.map((category) =>
    `<option value="${category.category_id}">${LibraryApp.escapeHtml(category.category_name)}</option>`
  ).join('');
  document.getElementById('category-list').innerHTML = categories.length ? categories.map((category) =>
    `<span class="category-chip">${LibraryApp.escapeHtml(category.category_name)}<button class="delete-category" data-category-id="${category.category_id}" type="button" aria-label="Delete ${LibraryApp.escapeHtml(category.category_name)}">×</button></span>`
  ).join('') : '<span class="muted">Add your first category to start cataloging books.</span>';
}

function resetBookForm() {
  document.getElementById('book-form').reset();
  document.getElementById('edit-book-id').value = '';
  document.getElementById('book-form-title').textContent = 'Add a book';
  document.getElementById('save-book').textContent = 'Add book';
  document.getElementById('cancel-edit').hidden = true;
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await LibraryApp.requireUser('admin');
  if (!user) return;
  try {
    await Promise.all([refreshBooks(), refreshCategories()]);
  } catch (error) {
    LibraryApp.showAlert('page-alert', error.message);
  }
  document.getElementById('book-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    LibraryApp.clearAlert('page-alert');
    const bookId = document.getElementById('edit-book-id').value;
    const body = {
      title: document.getElementById('book-title').value,
      author: document.getElementById('book-author').value,
      isbn: document.getElementById('book-isbn').value,
      categoryId: Number(document.getElementById('book-category').value),
      totalCopies: Number(document.getElementById('book-copies').value)
    };
    try {
      const result = await LibraryApp.api(bookId ? `/api/admin/books/${bookId}` : '/api/admin/books', {
        method: bookId ? 'PUT' : 'POST', body
      });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      resetBookForm();
      await refreshBooks();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
    }
  });
  document.getElementById('cancel-edit').addEventListener('click', resetBookForm);
  document.getElementById('category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const result = await LibraryApp.api('/api/admin/categories', {
        method: 'POST',
        body: { categoryName: document.getElementById('category-name').value }
      });
      event.currentTarget.reset();
      LibraryApp.showAlert('page-alert', result.message, 'success');
      await refreshCategories();
      await refreshBooks();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
    }
  });
  document.getElementById('book-rows').addEventListener('click', async (event) => {
    const edit = event.target.closest('.edit-book');
    const remove = event.target.closest('.delete-book');
    if (edit) {
      const book = managedBooks.find((item) => item.book_id === Number(edit.dataset.bookId));
      if (!book) return;
      document.getElementById('edit-book-id').value = book.book_id;
      document.getElementById('book-title').value = book.title;
      document.getElementById('book-author').value = book.author;
      document.getElementById('book-isbn').value = book.isbn;
      document.getElementById('book-category').value = book.category_id;
      document.getElementById('book-copies').value = book.total_copies;
      document.getElementById('book-form-title').textContent = 'Edit book';
      document.getElementById('save-book').textContent = 'Save changes';
      document.getElementById('cancel-edit').hidden = false;
      document.getElementById('book-title').focus();
    } else if (remove && window.confirm('Delete this book from the catalog? Books referenced by issues or reservations cannot be deleted.')) {
      try {
        const result = await LibraryApp.api(`/api/admin/books/${remove.dataset.bookId}`, { method: 'DELETE' });
        LibraryApp.showAlert('page-alert', result.message, 'success');
        await refreshBooks();
      } catch (error) {
        LibraryApp.showAlert('page-alert', error.message);
      }
    }
  });
  document.getElementById('category-list').addEventListener('click', async (event) => {
    const button = event.target.closest('.delete-category');
    if (!button || !window.confirm('Delete this category? Categories containing books cannot be deleted.')) return;
    try {
      const result = await LibraryApp.api(`/api/admin/categories/${button.dataset.categoryId}`, { method: 'DELETE' });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      await refreshCategories();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
    }
  });
});
