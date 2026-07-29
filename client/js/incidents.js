document.addEventListener('DOMContentLoaded', () => {
  const incidentTypes = [
    'Medical Emergency',
    'Fire Alarm',
    'Water Leak / Flood',
    'Property Damage',
    'Suspicious Activity',
    'Theft',
    'Resident Complaint',
    'Parking Incident',
    'Elevator Issue',
    'Access Control Issue',
    'Noise Complaint',
    'Police Attendance',
    'Parking Enforcement Attendance',
    'Other'
  ];

  const createButton = document.getElementById('createIncidentBtn');
  const searchInput = document.getElementById('incidentSearch');
  const fromInput = document.getElementById('incidentFrom');
  const toInput = document.getElementById('incidentTo');
  const statusFilter = document.getElementById('incidentStatusFilter');
  const typeFilter = document.getElementById('incidentTypeFilter');
  const clearFiltersButton = document.getElementById('clearIncidentFilters');
  const rowsBody = document.getElementById('incidentRows');
  const formPanel = document.getElementById('incidentFormPanel');
  const closeButton = document.getElementById('closeIncidentFormBtn');
  const form = document.getElementById('incidentForm');
  const formHeading = document.getElementById('incidentFormHeading');
  const draftState = document.getElementById('incidentDraftState');
  const draftButton = document.getElementById('saveIncidentDraftBtn');
  const submitButton = document.getElementById('submitIncidentBtn');
  const idField = document.getElementById('incidentId');
  const attachmentInput = document.getElementById('incidentAttachment');
  const backupKey = 'incident-draft-backup';
  let currentRecord = null;
  let isSubmitting = false;
  let autosaveTimer = null;
  let pendingAttachment = null;

  incidentTypes.forEach((incidentType) => {
    const option = document.createElement('option');
    option.value = incidentType;
    option.textContent = incidentType;
    document.getElementById('incidentType').appendChild(option);

    const filterOption = document.createElement('option');
    filterOption.value = incidentType;
    filterOption.textContent = incidentType;
    typeFilter.appendChild(filterOption);
  });

  function collectPayload() {
    return {
      title: document.getElementById('incidentTitle').value.trim(),
      incidentType: document.getElementById('incidentType').value,
      unitAffected: document.getElementById('incidentUnitAffected').value.trim(),
      submittedBy: document.getElementById('incidentSubmittedBy').value.trim(),
      officersInvolved: document.getElementById('incidentOfficersInvolved').value.trim(),
      reportText: document.getElementById('incidentReportText').value,
      status: currentRecord?.status === 'Viewed by PM' ? 'Viewed by PM' : (currentRecord?.status === 'Submitted' ? 'Submitted' : 'Draft')
    };
  }

  function validatePayload(payload) {
    if (!payload.title || !payload.incidentType || !payload.submittedBy || !payload.reportText.trim()) {
      return 'Please complete the required incident report fields.';
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

  function populateForm(record) {
    document.getElementById('incidentTitle').value = record?.title || '';
    document.getElementById('incidentType').value = record?.incidentType || '';
    document.getElementById('incidentUnitAffected').value = record?.unitAffected || '';
    document.getElementById('incidentSubmittedBy').value = record?.submittedBy || '';
    document.getElementById('incidentOfficersInvolved').value = record?.officersInvolved || '';
    document.getElementById('incidentReportText').value = record?.reportText || '';
    attachmentInput.value = '';
    draftState.textContent = record ? `Status: ${record.status}` : 'Draft not saved yet.';

    const existingSubmissionInfo = document.getElementById('incidentSubmissionInfo');
    if (existingSubmissionInfo) {
      existingSubmissionInfo.remove();
    }

    if (record?.submissionDateTime) {
      const info = document.createElement('p');
      info.id = 'incidentSubmissionInfo';
      info.className = 'status-message';
      info.textContent = `Submitted on ${formatDateTime(record.submissionDateTime)}`;
      form.prepend(info);
    }
  }

  function applyReadOnlyState(isReadOnly) {
    [...form.querySelectorAll('input, select, textarea')].forEach((field) => {
      if (field.id === 'incidentId' || field.id === 'incidentAttachment') return;
      field.disabled = Boolean(isReadOnly);
    });
    attachmentInput.disabled = Boolean(isReadOnly);
    draftButton.style.display = isReadOnly ? 'none' : 'inline-flex';
    submitButton.style.display = isReadOnly ? 'none' : 'inline-flex';
  }

  function showForm(record = null) {
    if (Object.prototype.hasOwnProperty.call(formPanel, 'hidden')) {
      formPanel.hidden = false;
    }
    currentRecord = record;
    idField.value = record?.id || '';
    populateForm(record);
    applyReadOnlyState(record?.status === 'Submitted' || record?.status === 'Viewed by PM');
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideForm() {
    if (Object.prototype.hasOwnProperty.call(formPanel, 'hidden')) {
      formPanel.hidden = true;
    }
  }

  async function uploadAttachmentIfNeeded(incidentId) {
    if (!pendingAttachment) return null;
    const file = pendingAttachment;
    const uploadData = await getIncidentAttachmentUploadUrl(incidentId, {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size
    });

    const uploadResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Could not upload the attachment.');
    }

    return {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      s3Key: uploadData.key
    };
  }

  async function saveDraft() {
    const payload = collectPayload();
    const validationError = validatePayload(payload);
    if (validationError) {
      setStatusMessage(draftState, validationError, true);
      return;
    }

    try {
      if (currentRecord?.id) {
        const result = await updateIncident(currentRecord.id, payload);
        currentRecord = result.incident;
      } else {
        const result = await createIncident(payload);
        currentRecord = result.incident;
        idField.value = currentRecord.id;
      }

      draftState.textContent = `Draft saved at ${new Date().toLocaleTimeString()}`;
      localStorage.removeItem(backupKey);
      renderIncidents();
    } catch (error) {
      setStatusMessage(draftState, error.message || 'Could not save draft.', true);
      saveLocalBackup();
    }
  }

  async function submitIncidentReport() {
    if (isSubmitting) return;
    const payload = collectPayload();
    const validationError = validatePayload(payload);
    if (validationError) {
      setStatusMessage(draftState, validationError, true);
      return;
    }

    if (!window.confirm('Are you sure you want to submit this incident report?')) {
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;

    try {
      let record = currentRecord;
      if (record?.id) {
        const updated = await updateIncident(record.id, payload);
        record = updated.incident;
      } else {
        const created = await createIncident(payload);
        record = created.incident;
        idField.value = record.id;
      }

      const attachment = await uploadAttachmentIfNeeded(record.id);
      if (attachment) {
        record = (await updateIncident(record.id, { ...payload, attachment })).incident;
      }

      const submitted = await submitIncident(record.id);
      currentRecord = submitted.incident;
      populateForm(currentRecord);
      applyReadOnlyState(true);
      draftState.textContent = `Submitted on ${formatDateTime(currentRecord.submissionDateTime)}`;
      localStorage.removeItem(backupKey);
      renderIncidents();
    } catch (error) {
      setStatusMessage(draftState, error.message || 'Could not submit incident report.', true);
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
    }
  }

  function scheduleAutosave() {
    saveLocalBackup();
    clearTimeout(autosaveTimer);
    if (!currentRecord?.id || currentRecord.status === 'Submitted' || currentRecord.status === 'Viewed by PM') {
      return;
    }
    autosaveTimer = setTimeout(() => {
      saveDraft();
    }, 2500);
  }

  async function renderIncidents() {
    try {
      const data = await getIncidents({
        search: searchInput.value.trim(),
        from: fromInput.value,
        to: toInput.value,
        status: statusFilter.value,
        incidentType: typeFilter.value
      });

      rowsBody.innerHTML = '';
      if (!data.incidents.length) {
        rowsBody.innerHTML = '<tr><td colspan="4">No incident reports found.</td></tr>';
        return;
      }

      data.incidents.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.title}</td>
          <td>${item.submittedBy}</td>
          <td><span class="badge">${item.status}</span></td>
          <td><button type="button" class="secondary-btn" data-view-id="${item.id}">View</button></td>
        `;
        rowsBody.appendChild(row);
      });
    } catch (error) {
      rowsBody.innerHTML = `<tr><td colspan="4">${error.message || 'Could not load incident reports.'}</td></tr>`;
    }
  }

  if (createButton) {
    createButton.addEventListener('click', () => {
      currentRecord = null;
      pendingAttachment = null;
      idField.value = '';
      showForm(null);
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', hideForm);
  }
  draftButton.addEventListener('click', saveDraft);
  submitButton.addEventListener('click', submitIncidentReport);

  rowsBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-view-id]');
    if (!button) return;
    try {
      const result = await getIncident(button.getAttribute('data-view-id'));
      currentRecord = result.incident;
      pendingAttachment = null;
      showForm(result.incident);
      if (result.incident.attachment?.s3Key) {
        const attachmentUrl = await getIncidentAttachmentDownloadUrl(result.incident.id);
        const link = document.createElement('a');
        link.href = attachmentUrl.downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Open attachment';
        link.className = 'secondary-btn';
        const existing = document.getElementById('incidentAttachmentLink');
        if (existing) {
          existing.remove();
        }
        link.id = 'incidentAttachmentLink';
        form.prepend(link);
      }
    } catch (error) {
      setStatusMessage(draftState, error.message || 'Could not open incident report.', true);
    }
  });

  [searchInput, fromInput, toInput, statusFilter, typeFilter].forEach((field) => {
    field.addEventListener('input', renderIncidents);
    field.addEventListener('change', renderIncidents);
  });

  clearFiltersButton.addEventListener('click', () => {
    searchInput.value = '';
    fromInput.value = '';
    toInput.value = '';
    statusFilter.value = '';
    typeFilter.value = '';
    renderIncidents();
  });

  form.addEventListener('input', () => {
    if (currentRecord?.status === 'Submitted' || currentRecord?.status === 'Viewed by PM') return;
    scheduleAutosave();
  });

  attachmentInput.addEventListener('change', () => {
    pendingAttachment = attachmentInput.files?.[0] || null;
    scheduleAutosave();
  });

  const backup = loadLocalBackup();
  if (backup) {
    showForm({ ...backup, status: 'Draft' });
    draftState.textContent = 'Recovered unsaved draft from local backup.';
  }

  renderIncidents();
});
