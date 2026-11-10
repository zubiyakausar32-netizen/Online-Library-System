document.addEventListener('DOMContentLoaded', async () => {
  const user = await LibraryApp.requireUser('member');
  if (!user) return;
  try {
    const { issues, reservations } = await LibraryApp.api('/api/issues/mine');
    const active = issues.filter((issue) => !issue.return_date);
    const history = issues.filter((issue) => issue.return_date);
    const overdue = active.filter((issue) => Boolean(issue.is_overdue));
    const totalFine = active.reduce((sum, issue) => sum + Number(issue.accrued_fine), 0);
    document.getElementById('active-count').textContent = active.length;
    document.getElementById('overdue-count').textContent = overdue.length;
    document.getElementById('fine-total').textContent = LibraryApp.currency(totalFine);
    document.getElementById('history-count').textContent = history.length;
    document.getElementById('active-rows').innerHTML = active.length ? active.map((issue) => {
      const isOverdue = Boolean(issue.is_overdue);
      return `<tr><td><span class="cell-title">${LibraryApp.escapeHtml(issue.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(issue.author)}</span></td>
        <td>${LibraryApp.date(issue.issue_date)}</td><td>${LibraryApp.date(issue.due_date)}</td>
        <td><span class="badge ${isOverdue ? 'overdue' : 'available'}">${isOverdue ? 'Overdue' : 'On time'}</span></td>
        <td>${LibraryApp.currency(issue.accrued_fine)}</td></tr>`;
    }).join('') : '<tr><td colspan="5" class="empty-state"><strong>No active loans</strong>Browse the catalog to find your next book.</td></tr>';
    document.getElementById('reservation-rows').innerHTML = reservations.length ? reservations.map((item) =>
      `<tr><td><span class="cell-title">${LibraryApp.escapeHtml(item.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(item.author)}</span></td><td>${LibraryApp.date(item.reserved_at)}</td><td><span class="badge pending">In queue</span></td></tr>`
    ).join('') : '<tr><td colspan="3" class="empty-state">No pending reservations.</td></tr>';
    document.getElementById('history-rows').innerHTML = history.length ? history.map((issue) =>
      `<tr><td><span class="cell-title">${LibraryApp.escapeHtml(issue.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(issue.author)}</span></td><td>${LibraryApp.date(issue.issue_date)}</td><td>${LibraryApp.date(issue.return_date)}</td><td>${LibraryApp.currency(issue.fine)}</td></tr>`
    ).join('') : '<tr><td colspan="4" class="empty-state">Your returned books will appear here.</td></tr>';
  } catch (error) {
    LibraryApp.showAlert('page-alert', error.message);
  }
});
