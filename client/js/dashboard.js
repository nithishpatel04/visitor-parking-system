document.addEventListener('DOMContentLoaded', () => {
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

  async function refreshDashboard() {
    const [dashboardSummary, parkingTrend, incidentBreakdown] = await Promise.all([
      getDashboardSummary(),
      getParkingTrend(),
      getIncidentBreakdown()
    ]);

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
  }

  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  refreshDashboard();
});
