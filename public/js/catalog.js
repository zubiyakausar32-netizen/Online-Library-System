let catalogUser = null;
let catalogRequest = 0;

async function loadCategories() {
  const { categories } = await LibraryApp.api('/api/books/categories');
  document.getElementById('category-filter').insertAdjacentHTML(
    'beforeend',
    categories.map((category) => `<option value="${category.category_id}">${LibraryApp.escapeHtml(category.category_name)}</option>`).join('')
  );
}

async function loadBooks() {
  const request = ++catalogRequest;
  const query = new URLSearchParams();
  const search = document.getElementById('search-input').value.trim();
  const category = document.getElementById('category-filter').value;
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  const rows = document.getElementById('catalog-rows');
  try {
    const { books } = await LibraryApp.api(`/api/books?${query.toString()}`);
    if (request !== catalogRequest) return;
    rows.innerHTML = books.length ? books.map((book) => {
      const available = book.available_copies > 0;
      let action = '';
      if (catalogUser?.role === 'member') {
        action = `<button class="button small borrow-button" type="button" data-book-id="${book.book_id}">${available ? 'Borrow' : 'Reserve'}</button>`;
      } else if (catalogUser?.role === 'admin') {
        action = '<a class="button secondary small" href="/issue-return.html">Issue</a>';
      }
      return `<tr>
        <td><span class="cell-title">${LibraryApp.escapeHtml(book.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(book.author)}</span></td>
        <td>${LibraryApp.escapeHtml(book.category_name)}</td>
        <td>${LibraryApp.escapeHtml(book.isbn)}</td>
        <td><span class="badge ${available ? 'available' : 'issued'}">${available ? `${book.available_copies} available` : 'All copies issued'}</span></td>
        <td>${action}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="empty-state"><strong>No books found</strong>Try a different search or category.</td></tr>';
  } catch (error) {
    if (request !== catalogRequest) return;
    LibraryApp.showAlert('page-alert', error.message);
    rows.innerHTML = '<tr><td colspan="5" class="empty-state">Could not load the catalog.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    catalogUser = await LibraryApp.requireUser();
    if (!catalogUser) return;
    await loadCategories();
    await loadBooks();
  } catch (error) {
    LibraryApp.showAlert('page-alert', error.message);
  }
  let searchTimer;
  document.getElementById('search-input').addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadBooks, 250);
  });
  document.getElementById('category-filter').addEventListener('change', loadBooks);
  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    loadBooks();
  });
  document.getElementById('catalog-rows').addEventListener('click', async (event) => {
    const button = event.target.closest('.borrow-button');
    if (!button) return;
    button.disabled = true;
    try {
      const result = await LibraryApp.api('/api/issues/borrow', {
        method: 'POST',
        body: { bookId: Number(button.dataset.bookId) }
      });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      await loadBooks();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
      button.disabled = false;
    }
  });
});
