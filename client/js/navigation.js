document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.app-sidebar');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const overlay = document.querySelector('.sidebar-overlay');
  const activePage = document.body.dataset.page || '';
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  document.querySelectorAll('[data-nav]').forEach((item) => {
    if (item.getAttribute('data-nav') === activePage) {
      item.classList.add('active');
    }
  });

  const adminItem = document.querySelector('[data-nav="admin"]');
  if (adminItem && (!user || user.role !== 'admin')) {
    adminItem.hidden = true;
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  if (sidebar) {
    sidebar.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) {
        closeSidebar();
      }
    });
  }

  const logoutButton = document.getElementById('logoutBtn');
  if (logoutButton && typeof logout === 'function') {
    logoutButton.addEventListener('click', logout);
  }
});
