document.addEventListener('DOMContentLoaded', async () => {
  const user = await LibraryApp.requireUser('admin');
  if (!user) return;
  try {
    const [dashboard, memberData] = await Promise.all([
      LibraryApp.api('/api/admin/dashboard'),
      LibraryApp.api('/api/admin/members')
    ]);
    document.getElementById('stat-titles').textContent = dashboard.metrics.titles;
    document.getElementById('stat-copies').textContent = `${dashboard.metrics.copies} total copies`;
    document.getElementById('stat-members').textContent = dashboard.metrics.members;
    document.getElementById('stat-issued').textContent = dashboard.metrics.issuedToday;
    document.getElementById('stat-overdue').textContent = dashboard.metrics.overdue;
    document.getElementById('overdue-rows').innerHTML = dashboard.overdue.length ? dashboard.overdue.map((item) =>
      `<tr><td><span class="cell-title">${LibraryApp.escapeHtml(item.title)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(item.author)}</span></td>
        <td><span class="cell-title">${LibraryApp.escapeHtml(item.member_name)}</span><span class="cell-subtitle">${LibraryApp.escapeHtml(item.email)}</span></td>
        <td>${LibraryApp.date(item.due_date)}</td><td>${item.days_overdue} days</td><td>${LibraryApp.currency(item.estimated_fine)}</td></tr>`
    ).join('') : '<tr><td colspan="5" class="empty-state"><strong>All caught up</strong>No overdue books right now.</td></tr>';
    document.getElementById('member-rows').innerHTML = memberData.members.length ? memberData.members.map((member) =>
      `<tr><td><span class="cell-title">${LibraryApp.escapeHtml(member.name)}</span></td><td>${LibraryApp.escapeHtml(member.email)}</td><td>${LibraryApp.date(member.created_at)}</td><td>${member.active_loans}</td><td><button class="button danger small remove-member" data-member-id="${member.user_id}" type="button">Remove</button></td></tr>`
    ).join('') : '<tr><td colspan="5" class="empty-state">No members have registered yet.</td></tr>';
  } catch (error) {
    LibraryApp.showAlert('page-alert', error.message);
  }
  document.getElementById('member-rows').addEventListener('click', async (event) => {
    const button = event.target.closest('.remove-member');
    if (!button || !window.confirm('Remove this member? Accounts with borrowing or reservation history cannot be removed.')) return;
    try {
      const result = await LibraryApp.api(`/api/admin/members/${button.dataset.memberId}`, { method: 'DELETE' });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      button.closest('tr').remove();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
    }
  });
});
