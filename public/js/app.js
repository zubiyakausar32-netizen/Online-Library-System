const LibraryApp = (() => {
  let csrfToken = '';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function showAlert(target, message, type = 'error') {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) return;
    element.className = `alert show ${type}`;
    element.textContent = message;
  }

  function clearAlert(target) {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) return;
    element.className = 'alert';
    element.textContent = '';
  }

  async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    const response = await fetch('/api/auth/csrf');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not start a secure session.');
    csrfToken = data.csrfToken;
    return csrfToken;
  }

  async function api(url, options = {}) {
    const config = { ...options, headers: { ...(options.headers || {}) } };
    if (config.body && typeof config.body !== 'string') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }
    if (config.method && !['GET', 'HEAD'].includes(config.method.toUpperCase())) {
      config.headers['X-CSRF-Token'] = await getCsrfToken();
    }
    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('The server returned an unexpected response.');
    }
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    if (data.csrfToken) csrfToken = data.csrfToken;
    return data;
  }

  async function currentUser() {
    return (await api('/api/auth/me')).user;
  }

  async function requireUser(role) {
    const user = await currentUser();
    if (!user) {
      window.location.href = '/login.html';
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === 'admin' ? '/admin-dashboard.html' : '/catalog.html';
      return null;
    }
    return user;
  }

  function date(value) {
    if (!value) return '—';
    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.valueOf()) ? escapeHtml(value) : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function currency(value) {
    return `Rs. ${Number(value || 0).toFixed(2)}`;
  }

  function setNavigation(user) {
    const links = document.getElementById('nav-links');
    const label = user ? `<a class="nav-user" href="/profile.html">Hello, ${escapeHtml(user.name)}</a>` : '';
    const common = user
      ? `<a href="${user.role === 'admin' ? '/admin-dashboard.html' : '/catalog.html'}">${user.role === 'admin' ? 'Dashboard' : 'Catalog'}</a>`
      : '';
    const roleLinks = user?.role === 'admin'
      ? '<a href="/manage-books.html">Manage books</a><a href="/issue-return.html">Issue &amp; return</a>'
      : user ? '<a href="/my-books.html">My books</a>' : '';
    const authLinks = user
      ? '<button type="button" id="logout-button">Log out</button>'
      : '<a class="button small" href="/register.html">Join the library</a>';
    links.innerHTML = `${common}${roleLinks}${label}${authLinks}`;
    const logout = document.getElementById('logout-button');
    if (logout) {
      logout.addEventListener('click', async () => {
        try {
          await api('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login.html';
        } catch (error) {
          window.alert(error.message);
        }
      });
    }
  }

  async function initNavigation() {
    const toggle = document.getElementById('mobile-menu');
    const links = document.getElementById('nav-links');
    toggle?.addEventListener('click', () => links.classList.toggle('open'));
    try {
      setNavigation(await currentUser());
    } catch {
      setNavigation(null);
    }
  }

  return { api, clearAlert, currency, currentUser, date, escapeHtml, initNavigation, requireUser, showAlert };
})();

document.addEventListener('DOMContentLoaded', LibraryApp.initNavigation);
