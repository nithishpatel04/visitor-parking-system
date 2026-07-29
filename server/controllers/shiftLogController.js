const { docClient, TABLES, PutCommand, GetCommand, ScanCommand, DeleteCommand } = require('../config/dynamodb');
const { requireAuth } = require('../services/authorization');
const { createId } = require('../utils/ids');
const { nowIso, toDateOnly } = require('../utils/dates');
const { trimText, isAllowedShiftType, isAllowedStatus } = require('../services/validation');
const { writeJson } = require('../utils/response');

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

function normalizeShiftLog(item) {
  if (!item) return null;
  return {
    ...item,
    officerName2: item.officerName2 || '',
    submissionDateTime: item.submissionDateTime || null
  };
}

function buildCreatedBy(item) {
  return item.officerName2 ? `${item.officerName1} / ${item.officerName2}` : item.officerName1;
}

async function listShiftLogs(req, res, url) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.SHIFT_LOGS }));
    const search = trimText(url.searchParams.get('search')).toLowerCase();
    const status = trimText(url.searchParams.get('status'));
    const from = trimText(url.searchParams.get('from'));
    const to = trimText(url.searchParams.get('to'));

    let items = (result.Items || []).map(normalizeShiftLog);
    if (search) {
      items = items.filter((item) => {
        const haystack = [item.title, item.officerName1, item.officerName2, item.building, item.shiftType].join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }

    if (status) {
      items = items.filter((item) => item.status === status);
    }

    if (from) {
      items = items.filter((item) => item.shiftDate >= from);
    }

    if (to) {
      items = items.filter((item) => item.shiftDate <= to);
    }

    items.sort((a, b) => String(b.shiftDate).localeCompare(String(a.shiftDate)));
    writeJson(res, 200, { shiftLogs: items.map((item) => ({ ...item, createdBy: buildCreatedBy(item) })) });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch shift logs' });
  }
}

async function getShiftLog(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.SHIFT_LOGS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Shift log not found' });
      return;
    }
    writeJson(res, 200, { shiftLog: normalizeShiftLog(result.Item) });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch shift log' });
  }
}

async function createShiftLog(req, res) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const payload = await parseBody(req);
    const title = trimText(payload.title);
    const building = trimText(payload.building);
    const shiftDate = trimText(payload.shiftDate);
    const shiftType = trimText(payload.shiftType);
    const officerName1 = trimText(payload.officerName1);
    const officerName2 = trimText(payload.officerName2);
    const shiftStartTime = trimText(payload.shiftStartTime);
    const shiftEndTime = trimText(payload.shiftEndTime);
    const reportText = trimText(payload.reportText);
    const status = trimText(payload.status) || 'Draft';

    if (!title || !building || !shiftDate || !shiftType || !officerName1 || !shiftStartTime || !shiftEndTime || !reportText || !isAllowedShiftType(shiftType) || !isAllowedStatus(status, 'shift')) {
      writeJson(res, 400, { error: 'Please complete the required shift log fields.' });
      return;
    }

    const id = createId();
    const item = {
      id,
      title,
      building,
      shiftDate,
      shiftType,
      officerName1,
      officerName2,
      shiftStartTime,
      shiftEndTime,
      securityChecks: payload.securityChecks || {},
      reportText,
      status,
      submissionDateTime: status === 'Submitted' ? nowIso() : null
    };

    await docClient.send(new PutCommand({ TableName: TABLES.SHIFT_LOGS, Item: item }));
    writeJson(res, 201, { shiftLog: normalizeShiftLog(item) });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not save shift log' });
  }
}

async function updateShiftLog(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const existing = await docClient.send(new GetCommand({ TableName: TABLES.SHIFT_LOGS, Key: { id } }));
    if (!existing.Item) {
      writeJson(res, 404, { error: 'Shift log not found' });
      return;
    }
    if (existing.Item.status === 'Submitted') {
      writeJson(res, 409, { error: 'Submitted shift logs cannot be edited' });
      return;
    }

    const payload = await parseBody(req);
    const updated = {
      ...existing.Item,
      title: trimText(payload.title) || existing.Item.title,
      building: trimText(payload.building) || existing.Item.building,
      shiftDate: trimText(payload.shiftDate) || existing.Item.shiftDate,
      shiftType: trimText(payload.shiftType) || existing.Item.shiftType,
      officerName1: trimText(payload.officerName1) || existing.Item.officerName1,
      officerName2: trimText(payload.officerName2),
      shiftStartTime: trimText(payload.shiftStartTime) || existing.Item.shiftStartTime,
      shiftEndTime: trimText(payload.shiftEndTime) || existing.Item.shiftEndTime,
      securityChecks: payload.securityChecks || existing.Item.securityChecks,
      reportText: trimText(payload.reportText) || existing.Item.reportText,
      status: trimText(payload.status) || existing.Item.status
    };

    await docClient.send(new PutCommand({ TableName: TABLES.SHIFT_LOGS, Item: updated }));
    writeJson(res, 200, { shiftLog: normalizeShiftLog(updated) });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not update shift log' });
  }
}

async function submitShiftLog(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.SHIFT_LOGS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Shift log not found' });
      return;
    }
    if (result.Item.status === 'Submitted') {
      writeJson(res, 409, { error: 'Shift log is already submitted' });
      return;
    }

    const submissionDateTime = nowIso();
    const updated = { ...result.Item, status: 'Submitted', submissionDateTime };
    await docClient.send(new PutCommand({ TableName: TABLES.SHIFT_LOGS, Item: updated }));
    writeJson(res, 200, { shiftLog: normalizeShiftLog(updated) });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not submit shift log' });
  }
}

async function deleteShiftLog(req, res, id) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.SHIFT_LOGS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Shift log not found' });
      return;
    }
    if (result.Item.status === 'Submitted') {
      writeJson(res, 409, { error: 'Submitted shift logs cannot be deleted' });
      return;
    }

    await docClient.send(new DeleteCommand({ TableName: TABLES.SHIFT_LOGS, Key: { id } }));
    writeJson(res, 200, { success: true });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to delete shift log' });
  }
}

module.exports = {
  listShiftLogs,
  getShiftLog,
  createShiftLog,
  updateShiftLog,
  submitShiftLog,
  deleteShiftLog
};
