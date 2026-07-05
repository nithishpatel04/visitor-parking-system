document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is admin, redirect if not
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  const rows = document.getElementById('unitRows');
  const history = document.getElementById('historyList');

  async function refreshAdmin() {
    const data = await getAdminData();
    rows.innerHTML = '';

    const exceptionsByKey = new Map((data.exceptions || []).map((entry) => [`${entry.building}::${entry.unit}`, entry]));

    data.report.forEach((row) => {
      const comboKey = `${row.building}::${row.unit}`;
      const entry = exceptionsByKey.get(comboKey);
      const isActive = Boolean(entry && entry.enabled && (!entry.expiresAt || new Date(entry.expiresAt) > new Date()));
      const days = entry && entry.days ? entry.days : 1;
      const statusLabel = isActive ? `Active for ${days} day${days > 1 ? 's' : ''}` : 'No active exception';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.building}</td>
        <td>${row.unit}</td>
        <td>${row.count}</td>
        <td>${row.atLimit ? '<span class="badge">At limit</span>' : 'Open'}</td>
        <td>${isActive ? `<span class="badge">${statusLabel}</span>` : `<span class="badge neutral">${statusLabel}</span>`}</td>
        <td>
          <select class="exception-days" data-building="${row.building}" data-unit="${row.unit}">
            <option value="1" ${days === 1 ? 'selected' : ''}>1 day</option>
            <option value="2" ${days === 2 ? 'selected' : ''}>2 days</option>
            <option value="3" ${days === 3 ? 'selected' : ''}>3 days</option>
            <option value="5" ${days === 5 ? 'selected' : ''}>5 days</option>
            <option value="7" ${days === 7 ? 'selected' : ''}>7 days</option>
          </select>
          <button class="toggle-btn ${isActive ? '' : 'disabled'}" data-building="${row.building}" data-unit="${row.unit}" data-enabled="${isActive ? 'true' : 'false'}">${isActive ? 'Disable exception' : 'Grant exception'}</button>
        </td>
      `;
      rows.appendChild(tr);
    });

    history.innerHTML = '';
    if (!data.history.length) {
      history.innerHTML = '<li>No exception changes yet.</li>';
      return;
    }

    data.history.forEach((entry) => {
      const li = document.createElement('li');
      const label = entry.enabled ? `Enabled for ${entry.days || 0} day${(entry.days || 0) === 1 ? '' : 's'}` : 'Disabled';
      li.innerHTML = `<strong>${entry.building} / ${entry.unit}</strong> — ${label} ${entry.reason ? `(${entry.reason})` : ''} at ${formatDateTime(entry.createdAt)}`;
      history.appendChild(li);
    });
  }

  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-building]');
    if (!button) return;
    const building = button.getAttribute('data-building');
    const unit = button.getAttribute('data-unit');
    const enabled = button.getAttribute('data-enabled') === 'true';
    const row = button.closest('tr');
    const select = row.querySelector('.exception-days');
    const days = Number(select?.value || 1);

    await updateException(building, unit, !enabled, 'Managed from admin console', enabled ? 0 : days);
    refreshAdmin();
  });

  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  refreshAdmin();
});
