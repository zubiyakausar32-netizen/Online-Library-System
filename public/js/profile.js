document.addEventListener('DOMContentLoaded', async () => {
  const user = await LibraryApp.requireUser();
  if (!user) return;

  document.getElementById('return-link').href = user.role === 'admin' ? '/admin-dashboard.html' : '/my-books.html';
  try {
    const { profile } = await LibraryApp.api('/api/auth/profile');
    document.getElementById('profile-name').value = profile.name;
    document.getElementById('profile-email').value = profile.email;
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('account-meta').textContent =
      `${profile.role === 'admin' ? 'Administrator' : 'Member'} · Joined ${LibraryApp.date(profile.created_at)}`;
  } catch (error) {
    LibraryApp.showAlert('page-alert', error.message);
    return;
  }

  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    LibraryApp.clearAlert('page-alert');
    try {
      const result = await LibraryApp.api('/api/auth/profile', {
        method: 'PUT',
        body: {
          name: document.getElementById('profile-name').value,
          email: document.getElementById('profile-email').value,
          phone: document.getElementById('profile-phone').value
        }
      });
      LibraryApp.showAlert('page-alert', result.message, 'success');
      await LibraryApp.initNavigation();
    } catch (error) {
      LibraryApp.showAlert('page-alert', error.message);
    }
  });
});
