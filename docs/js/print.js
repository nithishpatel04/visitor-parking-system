function generateSecuritySeal() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if ([2, 5, 8].includes(i)) result += '-';
  }
  return result;
}

document.addEventListener('DOMContentLoaded', () => {
  const pass = JSON.parse(localStorage.getItem('printPass') || 'null');

  if (!pass) {
    document.querySelector('.permit-card').innerHTML = '<p>No parking pass selected.</p>';
    return;
  }

  const permitId = `VP-${String(Date.now()).slice(-6)}`;
  const securitySeal = generateSecuritySeal();
  const startDate = new Date(pass.createdAt);
  const endDate = new Date(pass.endDate);

  const startFormatted = startDate.toLocaleString('en-US', {
    month: 'numeric',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const endFormatted = pass.duration === 0
    ? startDate.toLocaleString('en-US', {
        month: 'numeric',
        day: '2-digit',
        year: 'numeric'
      }) + ', 11:59 PM'
    : endDate.toLocaleString('en-US', {
        month: 'numeric',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

  document.getElementById('permitId').textContent = permitId;
  document.getElementById('securitySeal').textContent = securitySeal;
  document.getElementById('unitField').textContent = pass.unit || '—';
  document.getElementById('plateField').textContent = pass.plate || '—';
  document.getElementById('vehicleField').textContent = pass.vehicle || '—';
  document.getElementById('validFrom').textContent = startFormatted;
  document.getElementById('validUntil').textContent = endFormatted;
  document.getElementById('authorizedField').textContent = pass.authorizedBy || '—';

  document.getElementById('printButton').addEventListener('click', () => window.print());
});
