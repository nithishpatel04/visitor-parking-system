// API Base URL - Update this to your API Gateway URL
const BASE_URL = 'https://moyslzy49b.execute-api.us-east-1.amazonaws.com/prod';

async function requestJson(url, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };
  
  // Add auth token if available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Prepend base URL if using relative path
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  
  const response = await fetch(fullUrl, {
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function getPasses(params = {}) {
  const query = new URLSearchParams(params).toString();
  return requestJson(`/api/passes${query ? `?${query}` : ''}`);
}

async function createPass(payload) {
  return requestJson('/api/passes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function deletePass(id) {
  return requestJson(`/api/passes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function getAdminData() {
  return requestJson('/api/admin/units');
}

async function updateException(building, unit, enabled, reason = '', days = 0) {
  return requestJson(`/api/admin/exceptions/${encodeURIComponent(building)}/${encodeURIComponent(unit)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled, reason, days })
  });
}
