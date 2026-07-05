document.addEventListener('DOMContentLoaded', () => {
  const BASE_URL = 'https://r4muckg5ej.execute-api.us-east-1.amazonaws.com/prod';
  const form = document.getElementById('loginForm');
  const message = document.getElementById('message');
  const loading = document.querySelector('.loading');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showMessage('Please enter both username and password.', 'error');
      return;
    }

    loading.classList.add('show');

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store session in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      showMessage('Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    } catch (error) {
      showMessage(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      loading.classList.remove('show');
    }
  });

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `form-message ${type}`;
  }
});
