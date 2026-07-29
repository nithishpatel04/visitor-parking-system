document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('historyBody');
  const summary = {
    todayPasses: document.getElementById('todayPasses'),
    activePasses: document.getElementById('activePasses'),
    incidentReportsSubmitted: document.getElementById('incidentReportsSubmitted'),
    shiftReportsSubmittedToday: document.getElementById('shiftReportsSubmittedToday')
  };
  const parkingTrendChart = document.getElementById('parkingTrendChart');
  const incidentBreakdownChart = document.getElementById('incidentBreakdownChart');
  const recentIncidents = document.getElementById('recentIncidents');
  const recentShiftLogs = document.getElementById('recentShiftLogs');

  function renderChart(target, labels, values, emptyLabel) {
    if (!target) return;
    target.innerHTML = '';
    if (!labels.length || !values.length) {
      target.innerHTML = `<div class="recent-item"><div class="recent-title">${emptyLabel}</div></div>`;
      return;
    }

    const maxValue = Math.max(...values, 1);
    labels.forEach((label, index) => {
      const value = values[index] || 0;
      const column = document.createElement('div');
      column.className = 'chart-column';
      column.innerHTML = `
        <div class="chart-value">${value}</div>
        <div class="chart-bar" style="height:${Math.max((value / maxValue) * 180, 12)}px"></div>
        <div class="chart-label">${label}</div>
      `;
      target.appendChild(column);
    });
  }

  function renderRecentList(target, items, emptyMessage, formatter) {
    if (!target) return;
    target.innerHTML = '';
    if (!items.length) {
      target.innerHTML = `<div class="recent-item"><div class="recent-title">${emptyMessage}</div></div>`;
      return;
    }

    items.forEach((item) => {
      const element = document.createElement('div');
      element.className = 'recent-item';
      element.innerHTML = formatter(item);
      target.appendChild(element);
    });
  }

  function filterPasses(passes, filters) {
    return passes.filter((pass) => {
      const matchesBuilding = !filters.building || pass.building === filters.building;
      const matchesUnit = !filters.unit || pass.unit.toLowerCase().includes(filters.unit.toLowerCase());
      const matchesPlate = !filters.plate || pass.plate.toLowerCase().includes(filters.plate.toLowerCase());
      const matchesFrom = !filters.from || pass.createdAt >= `${filters.from}T00:00:00`;
      const matchesTo = !filters.to || pass.createdAt <= `${filters.to}T23:59:59`;
      return matchesBuilding && matchesUnit && matchesPlate && matchesFrom && matchesTo;
    });
  }

  function buildUsageMap(passes) {
    const usageMap = new Map();
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    passes.forEach((pass) => {
      const date = new Date(pass.createdAt);
      const passMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (passMonthKey !== monthKey) {
        return;
      }

      const key = `${pass.building}::${pass.unit}`;
      const dayCount = Number(pass.duration) > 0 ? Number(pass.duration) : 0;
      usageMap.set(key, (usageMap.get(key) || 0) + dayCount);
    });

    return usageMap;
  }

  async function refreshDashboard() {
    const filters = collectSearchState();
    const [passData, dashboardSummary, parkingTrend, incidentBreakdown] = await Promise.all([
      getPasses({}),
      getDashboardSummary(),
      getParkingTrend(),
      getIncidentBreakdown()
    ]);

    const filteredPasses = filterPasses(passData.passes, filters);
    const usageMap = buildUsageMap(passData.passes);

    if (summary.todayPasses) summary.todayPasses.textContent = dashboardSummary.todayPasses;
    if (summary.activePasses) summary.activePasses.textContent = dashboardSummary.activePasses;
    if (summary.incidentReportsSubmitted) summary.incidentReportsSubmitted.textContent = dashboardSummary.incidentReportsSubmitted;
    if (summary.shiftReportsSubmittedToday) summary.shiftReportsSubmittedToday.textContent = dashboardSummary.shiftReportsSubmittedToday;

    renderChart(parkingTrendChart, parkingTrend.labels || [], parkingTrend.values || [], 'No parking trend data yet.');
    renderChart(incidentBreakdownChart, incidentBreakdown.labels || [], incidentBreakdown.values || [], 'No incident reports submitted yet.');

    renderRecentList(
      recentIncidents,
      dashboardSummary.recentIncidentReports || [],
      'No recent incident reports.',
      (item) => `
        <div class="recent-title">${item.title || 'Untitled incident'}</div>
        <div class="recent-meta">${item.incidentType || 'Unknown type'} · ${item.status || 'Draft'} · ${formatDateTime(item.submissionDateTime || item.viewedDateTime)}</div>
        <div class="recent-meta">Submitted by ${item.submittedBy || 'Unknown'}</div>
      `
    );

    renderRecentList(
      recentShiftLogs,
      dashboardSummary.recentShiftLogs || [],
      'No recent shift logs.',
      (item) => `
        <div class="recent-title">${item.title || 'Untitled shift log'}</div>
        <div class="recent-meta">${item.shiftType || 'Unknown shift'} · ${item.status || 'Draft'} · ${formatDateTime(item.submissionDateTime || item.shiftDate)}</div>
        <div class="recent-meta">${item.building || 'Unknown building'} · ${item.officerName1 || 'Unassigned'}</div>
      `
    );

    renderPassTable(filteredPasses, body, usageMap);
  }

  document.getElementById('applySearch').addEventListener('click', refreshDashboard);
  document.getElementById('clearSearch').addEventListener('click', () => {
    clearSearchFields();
    refreshDashboard();
  });

  body.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = button.getAttribute('data-id');
    if (button.getAttribute('data-action') === 'delete') {
      await deletePass(id);
      refreshDashboard();
      return;
    }

    if (button.getAttribute('data-action') === 'print') {
      const pass = (await getPasses()).passes.find((item) => item.id === id);
      if (pass) {
        localStorage.setItem('printPass', JSON.stringify(pass));
        window.open('print.html', '_blank', 'noopener');
      }
    }
  });

  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  refreshDashboard();
});
