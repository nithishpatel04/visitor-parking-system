const { docClient, TABLES, PutCommand, GetCommand, ScanCommand, DeleteCommand } = require('../config/dynamodb');
const { requireAuth } = require('../services/authorization');
const { createId } = require('../utils/ids');
const { nowIso } = require('../utils/dates');
const { trimText, isAllowedIncidentType, isAllowedStatus } = require('../services/validation');
const { writeJson } = require('../utils/response');
const { createUploadUrl, createDownloadUrl, getBucketName } = require('../services/s3');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function normalizeIncident(item) {
  if (!item) return null;
  return { ...item, attachment: item.attachment || null, submissionDateTime: item.submissionDateTime || null, viewedDateTime: item.viewedDateTime || null };
}

async function listIncidents(req, res, url) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.INCIDENT_REPORTS }));
    const search = trimText(url.searchParams.get('search')).toLowerCase();
    const status = trimText(url.searchParams.get('status'));
    const incidentType = trimText(url.searchParams.get('incidentType'));
    const from = trimText(url.searchParams.get('from'));
    const to = trimText(url.searchParams.get('to'));

    let items = (result.Items || []).map(normalizeIncident);
    if (search) {
      items = items.filter((item) => {
        const haystack = [item.title, item.submittedBy, item.unitAffected, item.officersInvolved, item.incidentType].join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }
    if (status) items = items.filter((item) => item.status === status);
    if (incidentType) items = items.filter((item) => item.incidentType === incidentType);
    if (from) items = items.filter((item) => (item.submissionDateTime || item.reportDate || '') >= from);
    if (to) items = items.filter((item) => (item.submissionDateTime || item.reportDate || '') <= to);

    items.sort((a, b) => String(b.submissionDateTime || b.reportDate || '').localeCompare(String(a.submissionDateTime || a.reportDate || '')));
    writeJson(res, 200, { incidents: items });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch incident reports' });
  }
}

async function getIncident(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.INCIDENT_REPORTS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Incident report not found' });
      return;
    }

    const incident = normalizeIncident(result.Item);
    if (['manager', 'admin'].includes(session.role) && incident.status === 'Submitted') {
      const viewedDateTime = nowIso();
      incident.status = 'Viewed by PM';
      incident.viewedByManagement = true;
      incident.viewedDateTime = viewedDateTime;
      await docClient.send(new PutCommand({ TableName: TABLES.INCIDENT_REPORTS, Item: incident }));

      const notificationResult = await docClient.send(new ScanCommand({ TableName: TABLES.NOTIFICATIONS }));
      const notification = (notificationResult.Items || []).find((entry) => entry.incidentId === id && !entry.read);
      if (notification) {
        await docClient.send(new PutCommand({ TableName: TABLES.NOTIFICATIONS, Item: { ...notification, read: true, readDateTime: viewedDateTime } }));
      }
    }

    writeJson(res, 200, { incident });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch incident report' });
  }
}

async function createIncident(req, res) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const payload = await parseBody(req);
    const title = trimText(payload.title);
    const incidentType = trimText(payload.incidentType);
    const submittedBy = trimText(payload.submittedBy);
    const reportText = trimText(payload.reportText);
    const unitAffected = trimText(payload.unitAffected);
    const officersInvolved = trimText(payload.officersInvolved);
    const status = trimText(payload.status) || 'Draft';

    if (!title || !incidentType || !submittedBy || !reportText || !isAllowedIncidentType(incidentType) || !isAllowedStatus(status, 'incident')) {
      writeJson(res, 400, { error: 'Please complete the required incident report fields.' });
      return;
    }

    const id = createId();
    const item = {
      id,
      title,
      incidentType,
      unitAffected,
      submittedBy,
      officersInvolved,
      reportText,
      attachment: payload.attachment || null,
      status,
      submissionDateTime: status === 'Submitted' ? nowIso() : null,
      viewedByManagement: false,
      viewedDateTime: null
    };

    await docClient.send(new PutCommand({ TableName: TABLES.INCIDENT_REPORTS, Item: item }));
    writeJson(res, 201, { incident: normalizeIncident(item) });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not save incident report' });
  }
}

async function updateIncident(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.INCIDENT_REPORTS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Incident report not found' });
      return;
    }
    if (result.Item.status !== 'Draft') {
      writeJson(res, 409, { error: 'Submitted incident reports cannot be edited' });
      return;
    }

    const payload = await parseBody(req);
    const updated = {
      ...result.Item,
      title: trimText(payload.title) || result.Item.title,
      incidentType: trimText(payload.incidentType) || result.Item.incidentType,
      unitAffected: trimText(payload.unitAffected),
      submittedBy: trimText(payload.submittedBy) || result.Item.submittedBy,
      officersInvolved: trimText(payload.officersInvolved),
      reportText: trimText(payload.reportText) || result.Item.reportText,
      attachment: payload.attachment === undefined ? result.Item.attachment : payload.attachment
    };

    await docClient.send(new PutCommand({ TableName: TABLES.INCIDENT_REPORTS, Item: updated }));
    writeJson(res, 200, { incident: normalizeIncident(updated) });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not update incident report' });
  }
}

async function submitIncident(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.INCIDENT_REPORTS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Incident report not found' });
      return;
    }
    if (result.Item.status === 'Submitted' || result.Item.status === 'Viewed by PM') {
      writeJson(res, 409, { error: 'Incident report is already submitted' });
      return;
    }

    const submissionDateTime = nowIso();
    const updated = { ...result.Item, status: 'Submitted', submissionDateTime };
    await docClient.send(new PutCommand({ TableName: TABLES.INCIDENT_REPORTS, Item: updated }));

    const notification = {
      id: createId(),
      type: 'Incident Report',
      incidentId: id,
      title: updated.title,
      incidentType: updated.incidentType,
      unitAffected: updated.unitAffected,
      submittedBy: updated.submittedBy,
      submissionDateTime,
      read: false,
      readDateTime: null
    };
    await docClient.send(new PutCommand({ TableName: TABLES.NOTIFICATIONS, Item: notification }));

    writeJson(res, 200, { incident: normalizeIncident(updated) });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not submit incident report' });
  }
}

async function deleteIncident(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.INCIDENT_REPORTS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Incident report not found' });
      return;
    }
    if (result.Item.status !== 'Draft') {
      writeJson(res, 409, { error: 'Submitted incident reports cannot be deleted' });
      return;
    }

    await docClient.send(new DeleteCommand({ TableName: TABLES.INCIDENT_REPORTS, Key: { id } }));
    writeJson(res, 200, { success: true });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to delete incident report' });
  }
}

async function attachmentUploadUrl(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const payload = await parseBody(req);
    const bucket = getBucketName();
    if (!bucket) {
      writeJson(res, 500, { error: 'Attachment bucket is not configured' });
      return;
    }

    const key = `incident-reports/${id}/${createId()}-${String(payload.fileName || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
    const uploadUrl = await createUploadUrl({ bucket, key, contentType: payload.contentType });
    writeJson(res, 200, { uploadUrl, key });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not create upload URL' });
  }
}

async function attachmentDownloadUrl(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.INCIDENT_REPORTS, Key: { id } }));
    if (!result.Item || !result.Item.attachment?.s3Key) {
      writeJson(res, 404, { error: 'Attachment not found' });
      return;
    }

    const bucket = getBucketName();
    const downloadUrl = await createDownloadUrl({ bucket, key: result.Item.attachment.s3Key });
    writeJson(res, 200, { downloadUrl });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not create download URL' });
  }
}

module.exports = {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  submitIncident,
  deleteIncident,
  attachmentUploadUrl,
  attachmentDownloadUrl
};
