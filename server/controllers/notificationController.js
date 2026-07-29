const { docClient, TABLES, ScanCommand, PutCommand, GetCommand } = require('../config/dynamodb');
const { requireAuth } = require('../services/authorization');
const { writeJson } = require('../utils/response');
const { nowIso } = require('../utils/dates');

async function listNotifications(req, res) {
  const session = await requireAuth(req, res, ['manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.NOTIFICATIONS }));
    const notifications = (result.Items || []).filter((item) => !item.read).sort((a, b) => String(b.submissionDateTime || '').localeCompare(String(a.submissionDateTime || '')));
    writeJson(res, 200, { notifications });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch notifications' });
  }
}

async function notificationsCount(req, res) {
  const session = await requireAuth(req, res, ['manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.NOTIFICATIONS }));
    const count = (result.Items || []).filter((item) => !item.read).length;
    writeJson(res, 200, { count });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch notification count' });
  }
}

async function markNotificationRead(req, res, id) {
  const session = await requireAuth(req, res, ['manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLES.NOTIFICATIONS, Key: { id } }));
    if (!result.Item) {
      writeJson(res, 404, { error: 'Notification not found' });
      return;
    }

    const updated = { ...result.Item, read: true, readDateTime: nowIso() };
    await docClient.send(new PutCommand({ TableName: TABLES.NOTIFICATIONS, Item: updated }));
    writeJson(res, 200, { notification: updated });
  } catch (error) {
    writeJson(res, 400, { error: 'Could not update notification' });
  }
}

module.exports = { listNotifications, notificationsCount, markNotificationRead };
