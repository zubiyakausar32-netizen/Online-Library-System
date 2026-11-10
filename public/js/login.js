document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  LibraryApp.clearAlert('form-alert');
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await LibraryApp.api('/api/auth/login', {
      method: 'POST',
      body: { email: form.elements.email.value, password: form.elements.password.value }
    });
    window.location.href = data.user.role === 'admin' ? '/admin-dashboard.html' : '/catalog.html';
  } catch (error) {
    LibraryApp.showAlert('form-alert', error.message);
  } finally {
    button.disabled = false;
  }
});
