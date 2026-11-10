document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  LibraryApp.clearAlert('form-alert');
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await LibraryApp.api('/api/auth/register', {
      method: 'POST',
      body: {
        name: form.elements.name.value,
        email: form.elements.email.value,
        phone: form.elements.phone.value,
        password: form.elements.password.value
      }
    });
    LibraryApp.showAlert('form-alert', data.message, 'success');
    form.reset();
    window.setTimeout(() => { window.location.href = '/login.html'; }, 1100);
  } catch (error) {
    LibraryApp.showAlert('form-alert', error.message);
  } finally {
    button.disabled = false;
  }
});
