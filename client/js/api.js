const BASE_URL = 'https://r4muckg5ej.execute-api.us-east-1.amazonaws.com/prod';

function handleAuthFailure(statusCode) {
  if (statusCode === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = 'login.html';
  }
}

async function requestJson(url, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const response = await fetch(fullUrl, {
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    handleAuthFailure(response.status);
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

async function getDashboardSummary() {
  return requestJson('/api/dashboard/summary');
}

async function getParkingTrend() {
  return requestJson('/api/dashboard/parking-trend');
}

async function getIncidentBreakdown() {
  return requestJson('/api/dashboard/incident-breakdown');
}

async function getShiftLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return requestJson(`/api/shift-logs${query ? `?${query}` : ''}`);
}

async function getShiftLog(id) {
  return requestJson(`/api/shift-logs/${encodeURIComponent(id)}`);
}

async function createShiftLog(payload) {
  return requestJson('/api/shift-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function updateShiftLog(id, payload) {
  return requestJson(`/api/shift-logs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function submitShiftLog(id) {
  return requestJson(`/api/shift-logs/${encodeURIComponent(id)}/submit`, { method: 'POST' });
}

async function deleteShiftLog(id) {
  return requestJson(`/api/shift-logs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function getIncidents(params = {}) {
  const query = new URLSearchParams(params).toString();
  return requestJson(`/api/incidents${query ? `?${query}` : ''}`);
}

async function getIncident(id) {
  return requestJson(`/api/incidents/${encodeURIComponent(id)}`);
}

async function createIncident(payload) {
  return requestJson('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function updateIncident(id, payload) {
  return requestJson(`/api/incidents/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function submitIncident(id) {
  return requestJson(`/api/incidents/${encodeURIComponent(id)}/submit`, { method: 'POST' });
}

async function deleteIncident(id) {
  return requestJson(`/api/incidents/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function getIncidentAttachmentUploadUrl(id, payload) {
  return requestJson(`/api/incidents/${encodeURIComponent(id)}/attachment-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function getIncidentAttachmentDownloadUrl(id) {
  return requestJson(`/api/incidents/${encodeURIComponent(id)}/attachment-download-url`);
}

async function getNotifications() {
  return requestJson('/api/notifications');
}

async function getNotificationCount() {
  return requestJson('/api/notifications/count');
}

async function markNotificationRead(id) {
  return requestJson(`/api/notifications/${encodeURIComponent(id)}`, { method: 'POST' });
}
