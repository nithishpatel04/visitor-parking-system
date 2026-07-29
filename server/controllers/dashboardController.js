const { docClient, TABLES, ScanCommand } = require('../config/dynamodb');
const { requireAuth } = require('../services/authorization');
const { writeJson } = require('../utils/response');

async function getSummary(req, res) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const [passesResult, incidentsResult, shiftsResult, notificationsResult] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: TABLES.PASSES })),
      docClient.send(new ScanCommand({ TableName: TABLES.INCIDENT_REPORTS })),
      docClient.send(new ScanCommand({ TableName: TABLES.SHIFT_LOGS })),
      docClient.send(new ScanCommand({ TableName: TABLES.NOTIFICATIONS }))
    ]);

    const passes = passesResult.Items || [];
    const incidents = incidentsResult.Items || [];
    const shifts = shiftsResult.Items || [];
    const notifications = notificationsResult.Items || [];
    const today = new Date().toISOString().split('T')[0];

    writeJson(res, 200, {
      todayPasses: passes.filter((item) => String(item.createdAt || '').startsWith(today)).length,
      activePasses: passes.filter((item) => new Date(item.endDate || 0) >= new Date()).length,
      incidentReportsSubmitted: incidents.filter((item) => ['Submitted', 'Viewed by PM'].includes(item.status)).length,
      incidentReportsNotViewed: notifications.filter((item) => !item.read).length,
      shiftReportsSubmittedToday: shifts.filter((item) => item.status === 'Submitted' && String(item.submissionDateTime || '').startsWith(today)).length,
      shiftReportsDraft: shifts.filter((item) => item.status === 'Draft').length,
      recentIncidentReports: incidents.sort((a, b) => String(b.submissionDateTime || '').localeCompare(String(a.submissionDateTime || ''))).slice(0, 5),
      recentShiftLogs: shifts.sort((a, b) => String(b.shiftDate || '').localeCompare(String(a.shiftDate || ''))).slice(0, 5)
    });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch dashboard summary' });
  }
}

async function parkingTrend(req, res) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.PASSES }));
    const trend = {};
    const dates = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dates.push(key);
      trend[key] = 0;
    }

    (result.Items || []).forEach((item) => {
      const key = String(item.createdAt || '').split('T')[0];
      if (trend[key] !== undefined) {
        trend[key] += 1;
      }
    });

    writeJson(res, 200, { labels: dates, values: dates.map((date) => trend[date]) });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch parking trend' });
  }
}

async function incidentBreakdown(req, res) {
  const session = await requireAuth(req, res, ['concierge', 'manager', 'admin']);
  if (!session) return;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLES.INCIDENT_REPORTS }));
    const counts = new Map();
    (result.Items || []).forEach((item) => {
      const key = item.incidentType || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    writeJson(res, 200, { labels: Array.from(counts.keys()), values: Array.from(counts.values()) });
  } catch (error) {
    writeJson(res, 500, { error: 'Failed to fetch incident breakdown' });
  }
}

module.exports = { getSummary, parkingTrend, incidentBreakdown };
