document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('shiftSearch');
  const fromInput = document.getElementById('shiftFrom');
  const toInput = document.getElementById('shiftTo');
  const statusFilter = document.getElementById('shiftStatusFilter');
  const clearFiltersButton = document.getElementById('clearShiftFilters');
  const createButton = document.getElementById('createShiftLogBtn');
  const rowsBody = document.getElementById('shiftLogRows');
  const formPanel = document.getElementById('shiftLogFormPanel');
  const closeButton = document.getElementById('closeShiftFormBtn');
  const form = document.getElementById('shiftLogForm');
  const draftState = document.getElementById('shiftDraftState');
  const draftButton = document.getElementById('saveShiftDraftBtn');
  const submitButton = document.getElementById('submitShiftReportBtn');
  const idField = document.getElementById('shiftLogId');
  const backupKey = 'shift-log-draft-backup';
  let currentRecord = null;
  let autosaveTimer = null;
  let isSubmitting = false;

  const printButton = document.createElement('button');
  printButton.type = 'button';
  printButton.className = 'secondary-btn';
  printButton.textContent = 'Print';
  printButton.style.display = 'none';
  form.appendChild(printButton);

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function buildDefaultTitle(shiftType, shiftDate) {
    if (!shiftType || !shiftDate) return 'Shift Report';
    const date = new Date(`${shiftDate}T12:00:00`);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return `${shiftType} Shift Report – ${formattedDate}`;
  }

  function toggleNotesRequirement(statusField, notesField) {
    const isNo = statusField.value === 'No';
    notesField.required = isNo;
    if (!isNo) {
      notesField.value = notesField.value.trim();
    }
  }

  function setCheckFields(prefix, value = {}) {
    const statusField = document.getElementById(`check${capitalize(prefix)}Status`);
    const notesField = document.getElementById(`check${capitalize(prefix)}Notes`);
    if (!statusField || !notesField) return;
    statusField.value = value.completed === false ? 'No' : 'Yes';
    notesField.value = value.notes || '';
    toggleNotesRequirement(statusField, notesField);
  }

  function collectCheck(prefix) {
    const status = document.getElementById(`check${capitalize(prefix)}Status`).value;
    const notes = document.getElementById(`check${capitalize(prefix)}Notes`).value.trim();
    return { completed: status === 'Yes', notes };
  }

  function collectPayload() {
    return {
      title: document.getElementById('shiftTitle').value.trim(),
      building: document.getElementById('shiftBuilding').value.trim(),
      shiftDate: document.getElementById('shiftDate').value,
      shiftType: document.getElementById('shiftType').value,
      officerName1: document.getElementById('officerName1').value.trim(),
      officerName2: document.getElementById('officerName2').value.trim(),
      shiftStartTime: document.getElementById('shiftStartTime').value,
      shiftEndTime: document.getElementById('shiftEndTime').value,
      securityChecks: {
        cctv: collectCheck('cctv'),
        firePanel: collectCheck('firePanel'),
        masterKeys: collectCheck('masterKeys'),
        keyLockbox: collectCheck('keyLockbox'),
        buildingPatrol: collectCheck('patrol')
      },
      reportText: document.getElementById('shiftReportText').value,
      status: currentRecord?.status === 'Submitted' ? 'Submitted' : 'Draft'
    };
  }

  function validateDraft(payload) {
    const required = [payload.title, payload.building, payload.shiftDate, payload.shiftType, payload.officerName1, payload.shiftStartTime, payload.shiftEndTime, payload.reportText];
    if (required.some((value) => !String(value || '').trim())) {
      return 'Please complete the required shift log fields.';
    }
    if (Object.values(payload.securityChecks).some((check) => !check.completed && !check.notes)) {
      return 'Please add notes for any security check marked No.';
    }
    return '';
  }

  function saveLocalBackup() {
    localStorage.setItem(backupKey, JSON.stringify(collectPayload()));
  }

  function loadLocalBackup() {
    try {
      return JSON.parse(localStorage.getItem(backupKey) || 'null');
    } catch (error) {
      return null;
    }
  }

  function applyReadOnlyState(isReadOnly) {
    [...form.querySelectorAll('input, select, textarea')].forEach((field) => {
      if (field.id === 'shiftLogId') return;
      field.disabled = Boolean(isReadOnly);
    });
    draftButton.style.display = isReadOnly ? 'none' : 'inline-flex';
    submitButton.style.display = isReadOnly ? 'none' : 'inline-flex';
    printButton.style.display = isReadOnly ? 'inline-flex' : 'none';
  }

  function populateForm(record) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('shiftTitle').value = record?.title || '';
    document.getElementById('shiftBuilding').value = record?.building || '';
    document.getElementById('shiftDate').value = record?.shiftDate || today;
    document.getElementById('shiftType').value = record?.shiftType || '';
    document.getElementById('officerName1').value = record?.officerName1 || '';
    document.getElementById('officerName2').value = record?.officerName2 || '';
    document.getElementById('shiftStartTime').value = record?.shiftStartTime || '';
    document.getElementById('shiftEndTime').value = record?.shiftEndTime || '';
    document.getElementById('shiftReportText').value = record?.reportText || '';

    const securityChecks = record?.securityChecks || {};
    setCheckFields('cctv', securityChecks.cctv);
    setCheckFields('firePanel', securityChecks.firePanel);
    setCheckFields('masterKeys', securityChecks.masterKeys);
    setCheckFields('keyLockbox', securityChecks.keyLockbox);
    setCheckFields('patrol', securityChecks.buildingPatrol);

    if (!record?.title) {
      document.getElementById('shiftTitle').value = buildDefaultTitle(document.getElementById('shiftType').value, document.getElementById('shiftDate').value);
    }

    draftState.textContent = record ? `Status: ${record.status}` : 'Draft not saved yet.';
    const existingSubmissionInfo = document.getElementById('shiftSubmissionInfo');
    if (existingSubmissionInfo) {
      existingSubmissionInfo.remove();
    }
    if (record?.submissionDateTime) {
      const info = document.createElement('p');
      info.id = 'shiftSubmissionInfo';
      info.className = 'status-message';
      info.textContent = `Submitted on ${formatDateTime(record.submissionDateTime)}`;
      form.prepend(info);
    }
  }

  function showForm(record = null) {
    formPanel.hidden = false;
    currentRecord = record;
    idField.value = record?.id || '';
    populateForm(record);
    applyReadOnlyState(record?.status === 'Submitted');
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideForm() {
    formPanel.hidden = true;
  }

  async function persistDraft() {
    const payload = collectPayload();
    const validationError = validateDraft(payload);
    if (validationError) {
      setStatusMessage(draftState, validationError, true);
      return;
    }

    try {
      if (currentRecord?.id) {
        const result = await updateShiftLog(currentRecord.id, payload);
        currentRecord = result.shiftLog;
      } else {
        const result = await createShiftLog(payload);
        currentRecord = result.shiftLog;
        idField.value = currentRecord.id;
      }
      draftState.textContent = `Draft saved at ${new Date().toLocaleTimeString()}`;
      localStorage.removeItem(backupKey);
      renderShiftLogs();
    } catch (error) {
      setStatusMessage(draftState, error.message || 'Could not save draft.', true);
      saveLocalBackup();
    }
  }

  async function submitReport() {
    if (isSubmitting) return;

    const payload = collectPayload();
    const validationError = validateDraft(payload);
    if (validationError) {
      setStatusMessage(draftState, validationError, true);
      return;
    }

    if (!window.confirm('Are you sure you want to submit this shift report?')) {
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    try {
      if (currentRecord?.id) {
        await updateShiftLog(currentRecord.id, payload);
        const result = await submitShiftLog(currentRecord.id);
        currentRecord = result.shiftLog;
      } else {
        const created = await createShiftLog(payload);
        currentRecord = created.shiftLog;
        const result = await submitShiftLog(currentRecord.id);
        currentRecord = result.shiftLog;
      }
      populateForm(currentRecord);
      applyReadOnlyState(true);
      draftState.textContent = `Submitted on ${formatDateTime(currentRecord.submissionDateTime)}`;
      renderShiftLogs();
    } catch (error) {
      setStatusMessage(draftState, error.message || 'Could not submit shift report.', true);
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
    }
  }

  function scheduleAutosave() {
    saveLocalBackup();
    clearTimeout(autosaveTimer);
    if (!currentRecord?.id || currentRecord.status === 'Submitted') {
      return;
    }
    autosaveTimer = setTimeout(() => {
      persistDraft();
    }, 2500);
  }

  async function renderShiftLogs() {
    try {
      const data = await getShiftLogs({
        search: searchInput.value.trim(),
        from: fromInput.value,
        to: toInput.value,
        status: statusFilter.value
      });

      rowsBody.innerHTML = '';
      if (!data.shiftLogs.length) {
        rowsBody.innerHTML = '<tr><td colspan="4">No shift logs found.</td></tr>';
        return;
      }

      data.shiftLogs.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.title}</td>
          <td>${item.createdBy}</td>
          <td><span class="badge">${item.status}</span></td>
          <td><button type="button" class="secondary-btn" data-view-id="${item.id}">View</button></td>
        `;
        rowsBody.appendChild(row);
      });
    } catch (error) {
      rowsBody.innerHTML = `<tr><td colspan="4">${error.message || 'Could not load shift logs.'}</td></tr>`;
    }
  }

  createButton.addEventListener('click', () => {
    currentRecord = null;
    idField.value = '';
    showForm(null);
  });

  closeButton.addEventListener('click', hideForm);
  draftButton.addEventListener('click', persistDraft);
  submitButton.addEventListener('click', submitReport);
  printButton.addEventListener('click', () => window.print());

  rowsBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-view-id]');
    if (!button) return;
    try {
      const result = await getShiftLog(button.getAttribute('data-view-id'));
      showForm(result.shiftLog);
    } catch (error) {
      setStatusMessage(draftState, error.message || 'Could not open shift log.', true);
    }
  });

  [searchInput, fromInput, toInput, statusFilter].forEach((field) => {
    field.addEventListener('input', renderShiftLogs);
    field.addEventListener('change', renderShiftLogs);
  });

  clearFiltersButton.addEventListener('click', () => {
    searchInput.value = '';
    fromInput.value = '';
    toInput.value = '';
    statusFilter.value = '';
    renderShiftLogs();
  });

  form.addEventListener('input', () => {
    if (currentRecord?.status === 'Submitted') return;
    scheduleAutosave();
  });

  form.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', () => {
      if (select.id.startsWith('check')) {
        const notesField = document.getElementById(select.id.replace('Status', 'Notes'));
        toggleNotesRequirement(select, notesField);
      }
      if (select.id === 'shiftType') {
        const titleField = document.getElementById('shiftTitle');
        if (titleField && (!currentRecord || !currentRecord.title)) {
          titleField.value = buildDefaultTitle(select.value, document.getElementById('shiftDate').value);
        }
      }
      scheduleAutosave();
    });
  });

  form.querySelectorAll('input[type="text"], textarea, input[type="time"], input[type="date"]').forEach((field) => {
    field.addEventListener('input', () => {
      if (field.id === 'shiftType' || field.id === 'shiftDate') return;
      scheduleAutosave();
    });
  });

  document.getElementById('shiftDate').addEventListener('change', () => {
    const titleField = document.getElementById('shiftTitle');
    if (titleField && (!currentRecord || !currentRecord.title)) {
      titleField.value = buildDefaultTitle(document.getElementById('shiftType').value, document.getElementById('shiftDate').value);
    }
    scheduleAutosave();
  });

  const backup = loadLocalBackup();
  if (backup) {
    showForm({ ...backup, status: 'Draft' });
    draftState.textContent = 'Recovered unsaved draft from local backup.';
  }

  renderShiftLogs();
});
