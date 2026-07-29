const { readData } = require('../services/storage');
const { setException, getExceptions, getExceptionHistory } = require('../services/exceptionService');
const { requireAuth } = require('../services/authorization');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function buildUnitReport(state, date = new Date()) {
  const rows = new Map();
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  (state.passes || []).forEach((pass) => {
    const passDate = new Date(pass.createdAt);
    const passKey = `${passDate.getFullYear()}-${String(passDate.getMonth() + 1).padStart(2, '0')}`;
    if (passKey !== key) {
      return;
    }

    const comboKey = `${pass.building}::${pass.unit}`;
    if (!rows.has(comboKey)) {
      rows.set(comboKey, {
        building: pass.building,
        unit: pass.unit,
        count: 0
      });
    }

    const row = rows.get(comboKey);
    row.count += Number(pass.duration) > 0 ? Number(pass.duration) : 0;
  });

  return Array.from(rows.values()).map((row) => ({
    ...row,
    atLimit: row.count >= 10
  }));
}

function getAdminSummary(req, res) {
  (async () => {
    try {
      const session = await requireAuth(req, res, ['admin']);
      if (!session) return;

      const state = await readData();
      const report = buildUnitReport(state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ report, exceptions: getExceptions(state), history: getExceptionHistory(state) }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch admin data' }));
    }
  })();
}

function updateException(req, res, building, unit) {
  (async () => {
    try {
      const session = await requireAuth(req, res, ['admin']);
      if (!session) return;

      const parsed = await parseBody(req);
      const result = await setException(building, unit, parsed.enabled, parsed.reason || '', parsed.days || 0);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Could not update the exception.' }));
    }
  })();
}

module.exports = {
  getAdminSummary,
  updateException
};
