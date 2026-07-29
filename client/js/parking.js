document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('parkingForm');
  const message = document.getElementById('formMessage');
  const historyBody = document.getElementById('historyBody');

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

  async function refreshParkingHistory() {
    if (!historyBody) {
      return;
    }

    try {
      const filters = collectSearchState();
      const data = await getPasses({});
      const filteredPasses = filterPasses(data.passes || [], filters);
      const usageMap = buildUsageMap(data.passes || []);
      renderPassTable(filteredPasses, historyBody, usageMap);
    } catch (error) {
      historyBody.innerHTML = `<tr><td colspan="11">${error.message || 'Failed to load parking history.'}</td></tr>`;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    formData.duration = Number(formData.duration);

    const errors = validateParkingForm(formData);
    if (errors.length) {
      setStatusMessage(message, errors[0], true);
      return;
    }

    try {
      const result = await createPass(formData);
      setStatusMessage(message, result.message || 'Parking pass created.', false);
      
      // Store the pass in localStorage and redirect to print page
      if (result.pass) {
        localStorage.setItem('printPass', JSON.stringify(result.pass));
        setTimeout(() => {
          window.location.href = 'print.html';
        }, 500);
      }
      
      form.reset();
      await refreshParkingHistory();
    } catch (error) {
      setStatusMessage(message, error.message || 'Failed to create parking pass.', true);
      console.error('Error details:', error);
    }
  });

  const applySearchButton = document.getElementById('applySearch');
  const clearSearchButton = document.getElementById('clearSearch');

  if (applySearchButton) {
    applySearchButton.addEventListener('click', refreshParkingHistory);
  }

  if (clearSearchButton) {
    clearSearchButton.addEventListener('click', () => {
      clearSearchFields();
      refreshParkingHistory();
    });
  }

  if (historyBody) {
    historyBody.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const id = button.getAttribute('data-id');
      if (button.getAttribute('data-action') === 'delete') {
        await deletePass(id);
        refreshParkingHistory();
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

    refreshParkingHistory();
  }

  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});
