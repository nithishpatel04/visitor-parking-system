document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('message');
  const loading = document.querySelector('.loading');
  const submitButton = form.querySelector('button[type="submit"]');
  const buttonTextNode = submitButton ? submitButton.childNodes[submitButton.childNodes.length - 1] : null;
  let isSubmitting = false;

  // Warm API during credential entry to reduce first-login wait from cold starts.
  fetch('https://r4muckg5ej.execute-api.us-east-1.amazonaws.com/prod/api/auth/verify', {
    method: 'GET'
  }).catch(() => {});

  function setLoadingState(loadingState) {
    if (!submitButton) return;

    submitButton.disabled = loadingState;
    submitButton.style.opacity = loadingState ? '0.75' : '1';
    submitButton.style.cursor = loadingState ? 'not-allowed' : 'pointer';
    loading.classList.toggle('show', loadingState);

    if (buttonTextNode && buttonTextNode.nodeType === Node.TEXT_NODE) {
      buttonTextNode.textContent = loadingState ? 'Signing in...' : 'Login';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showMessage('Please enter both username and password.', 'error');
      return;
    }

    isSubmitting = true;
    setLoadingState(true);

    try {
      const response = await fetch('https://r4muckg5ej.execute-api.us-east-1.amazonaws.com/prod/api/auth/login', {
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
      window.location.href = 'index.html';
    } catch (error) {
      showMessage(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      isSubmitting = false;
      setLoadingState(false);
    }
  });

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `form-message ${type}`;
  }
});
