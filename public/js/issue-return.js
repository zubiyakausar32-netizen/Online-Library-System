async function refreshIssues() {
  const { issues, members, books } = await LibraryApp.api('/api/issues/open');
  document.getElementById('active-count').textContent = `${issues.length} active loans`;
  const memberSelect = document.getElementById('member-select');
  memberSelect.innerHTML = '<option value="">Select a member</option>' + members.map((member) =>
    `<option value="${member.user_id}">${LibraryApp.escapeHtml(member.name)} · ${LibraryApp.escapeHtml(member.email)}</option>`
  ).join('');
  const bookSelect = document.getElementById('book-select');
  const availableBooks = books.filter((book) => book.available_copies > 0);
  bookSelect.innerHTML = '<option value="">Select an available book</option>' + availableBooks.map((book) =>
    `<option value="${book.book_id}">${LibraryApp.escapeHtml(book.title)} · ${book.available_copies} available</option>`
  ).join('');
  document.getElementById('issue-rows').innerHTML = issues.length ? issues.map((issue) => {
    const overdue = Boolean(issue.is_overdue);
    return `<tr><td><span class="cell-title">${LibraryApp.escapeHtml(issue.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(issue.author)}</span></td>
      <td><span class="cell-title">${LibraryApp.escapeHtml(issue.member_name)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(issue.email)}</span></td>
      <td>${LibraryApp.date(issue.issue_date)}</td><td>${LibraryApp.date(issue.due_date)}</td>
      <td><span class="badge ${overdue ? 'overdue' : 'available'}">${overdue ? 'Overdue' : 'On time'}</span></td>
      <td><button class="button secondary small return-book" type="button" data-issue-id="${issue.issue_id}">Return</button></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state"><strong>No active loans</strong>All issued books have been returned.</td></tr>';
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await LibraryApp.requireUser('admin');
  if (!user) return;
  try {
    await refreshIssues();
  } catch (error) {
    LibraryApp.showAlert('page-alert', error.message);
  }
  document.getElementById('issue-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const result = await LibraryApp.api('/api/issues/admin-issue', {
        method: 'POST',
        body: {
          userId: Number(document.getElementById('member-select').value),
          bookId: Number(document.getElementById('book-select').value)
        }
      });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      await refreshIssues();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
    }
  });
  document.getElementById('issue-rows').addEventListener('click', async (event) => {
    const button = event.target.closest('.return-book');
    if (!button) return;
    button.disabled = true;
    try {
      const result = await LibraryApp.api(`/api/issues/${button.dataset.issueId}/return`, { method: 'POST', body: {} });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      await refreshIssues();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
      button.disabled = false;
    }
  });
});
