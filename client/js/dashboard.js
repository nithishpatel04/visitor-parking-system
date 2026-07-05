document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('historyBody');
  const summary = {
    todayPasses: document.getElementById('todayPasses'),
    activePasses: document.getElementById('activePasses'),
    unitsAtLimit: document.getElementById('unitsAtLimit'),
    exceptionsThisMonth: document.getElementById('exceptionsThisMonth')
  };

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
    const data = await getPasses({});
    const filteredPasses = filterPasses(data.passes, filters);
    const usageMap = buildUsageMap(data.passes);

    if (summary.todayPasses) summary.todayPasses.textContent = data.summary.todayPasses;
    if (summary.activePasses) summary.activePasses.textContent = data.summary.activePasses;
    if (summary.unitsAtLimit) summary.unitsAtLimit.textContent = data.summary.unitsAtLimit;
    if (summary.exceptionsThisMonth) summary.exceptionsThisMonth.textContent = data.summary.exceptionsThisMonth;
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
