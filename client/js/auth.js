// Client-side authentication helper

function checkAuthentication() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('authUser');

  if (!token || !user) {
    // Not authenticated, redirect to login
    window.location.href = 'login.html';
    return null;
  }

  try {
    return JSON.parse(user);
  } catch (error) {
    // Invalid user data, redirect to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = 'login.html';
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getCurrentUser() {
  const user = localStorage.getItem('authUser');
  if (user) {
    try {
      return JSON.parse(user);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

function hideAdminLink() {
  const adminLink = document.querySelector('a[href="admin.html"]');
  if (adminLink && !isAdmin()) {
    adminLink.style.display = 'none';
  }
}

function logout() {
  const token = getAuthToken();

  // Notify server about logout
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    }).catch(() => {});
  }

  // Clear local storage
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  
  // Redirect to login
  window.location.href = 'login.html';
}

// Run on page load to verify authentication
document.addEventListener('DOMContentLoaded', () => {
  // Don't check auth on login page
  if (window.location.pathname.includes('login.html')) {
    return;
  }

  checkAuthentication();
  hideAdminLink();
});
