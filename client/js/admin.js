document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is admin, redirect if not
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  const rows = document.getElementById('unitRows');
  const history = document.getElementById('historyList');
  const status = document.getElementById('adminStatus');
  const totalUnits = document.getElementById('totalUnits');
  const atLimitUnits = document.getElementById('atLimitUnits');
  const activeExceptions = document.getElementById('activeExceptions');
  const historyEntries = document.getElementById('historyEntries');
  const refreshBtn = document.getElementById('refreshAdminBtn');

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatus(message = '', isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', Boolean(isError));
  }

  async function refreshAdmin() {
    setStatus('Loading admin data...');
    const data = await getAdminData();
    rows.innerHTML = '';

    const exceptionsByKey = new Map((data.exceptions || []).map((entry) => [`${entry.building}::${entry.unit}`, entry]));

    const report = [...(data.report || [])].sort((a, b) => Number(b.atLimit) - Number(a.atLimit) || b.count - a.count);

    report.forEach((row) => {
      const comboKey = `${row.building}::${row.unit}`;
      const entry = exceptionsByKey.get(comboKey);
      const isActive = Boolean(entry && entry.enabled && (!entry.expiresAt || new Date(entry.expiresAt) > new Date()));
      const days = entry && entry.days ? entry.days : 1;
      const statusLabel = isActive ? `Active for ${days} day${days > 1 ? 's' : ''}` : 'No active exception';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(row.building)}</td>
        <td>${escapeHtml(row.unit)}</td>
        <td>${row.count}</td>
        <td>${row.atLimit ? '<span class="badge">At limit</span>' : 'Open'}</td>
        <td>${isActive ? `<span class="badge">${statusLabel}</span>` : `<span class="badge neutral">${statusLabel}</span>`}</td>
        <td class="action-cell">
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

    const activeCount = (data.exceptions || []).filter((entry) => entry.enabled && (!entry.expiresAt || new Date(entry.expiresAt) > new Date())).length;
    totalUnits.textContent = String(report.length);
    atLimitUnits.textContent = String(report.filter((entry) => entry.atLimit).length);
    activeExceptions.textContent = String(activeCount);
    historyEntries.textContent = String((data.history || []).length);

    history.innerHTML = '';
    if (!(data.history || []).length) {
      history.innerHTML = '<li>No exception changes yet.</li>';
      setStatus('Admin data is up to date.');
      return;
    }

    data.history.forEach((entry) => {
      const li = document.createElement('li');
      const label = entry.enabled ? `Enabled for ${entry.days || 0} day${(entry.days || 0) === 1 ? '' : 's'}` : 'Disabled';
      li.innerHTML = `<strong>${escapeHtml(entry.building)} / ${escapeHtml(entry.unit)}</strong> - ${label} ${entry.reason ? `(${escapeHtml(entry.reason)})` : ''} at ${formatDateTime(entry.createdAt)}`;
      history.appendChild(li);
    });

    setStatus('Admin data is up to date.');
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

    try {
      button.disabled = true;
      setStatus(`${enabled ? 'Disabling' : 'Granting'} exception for ${building} / ${unit}...`);
      await updateException(building, unit, !enabled, 'Managed from admin console', enabled ? 0 : days);
      await refreshAdmin();
    } catch (error) {
      setStatus(error.message || 'Could not update exception.', true);
    } finally {
      button.disabled = false;
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      try {
        refreshBtn.disabled = true;
        await refreshAdmin();
      } catch (error) {
        setStatus(error.message || 'Could not refresh admin data.', true);
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }

  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  try {
    await refreshAdmin();
  } catch (error) {
    setStatus(error.message || 'Failed to load admin data.', true);
  }
});
