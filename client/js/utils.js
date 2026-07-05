function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function formatDuration(days) {
  if (days === 0) {
    return 'Day-time (until 11:59 PM)';
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function setStatusMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? '#dc2626' : '#2563eb';
}
