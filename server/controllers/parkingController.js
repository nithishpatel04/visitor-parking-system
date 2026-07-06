const { readData, writeData } = require('../services/storage');
const { countPassesForMonth, getUnitsAtLimit } = require('../services/passCounter');
const { isExceptionEnabled } = require('../services/exceptionService');

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

function toDateValue(date) {
  return new Date(date).toISOString().split('T')[0];
}

function getSummary(state, date = new Date()) {
  const passes = state.passes || [];
  const today = toDateValue(date);
  const activePasses = passes.filter((pass) => toDateValue(pass.endDate) >= today);
  const todayPasses = passes.filter((pass) => toDateValue(pass.createdAt) === today);
  const exceptionCount = (state.exceptionHistory || []).filter((event) => toDateValue(event.createdAt) === today).length;

  return {
    todayPasses: todayPasses.length,
    activePasses: activePasses.length,
    unitsAtLimit: getUnitsAtLimit(date).length,
    exceptionsThisMonth: exceptionCount
  };
}

function listPasses(req, res, query) {
  const url = new URL(req.url, 'http://localhost');

  // Use async IIFE to handle async operations
  (async () => {
    try {
      const state = await readData();
      const building = (query.get('building') || '').trim();
      const unit = (query.get('unit') || '').trim();
      const plate = (query.get('plate') || '').trim().toLowerCase();
      const from = (query.get('from') || '').trim();
      const to = (query.get('to') || '').trim();

      let passes = [...(state.passes || [])];

      passes = passes.filter((pass) => {
        const matchesBuilding = !building || pass.building === building;
        const matchesUnit = !unit || pass.unit.toLowerCase().includes(unit.toLowerCase());
        const matchesPlate = !plate || pass.plate.toLowerCase().includes(plate);
        const passDate = pass.createdAt;
        const matchesFrom = !from || passDate >= from;
        const matchesTo = !to || passDate <= `${to}T23:59:59`;
        return matchesBuilding && matchesUnit && matchesPlate && matchesFrom && matchesTo;
      });

      passes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ passes, summary: getSummary(state) }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch passes' }));
    }
  })();
}

async function createPass(req, res) {
  try {
    const payload = await parseBody(req);
    console.log('=== CREATE PASS ===');
    console.log('Payload:', JSON.stringify(payload));
    
    const { building, unit, resident, plate, vehicle, color, duration, authorizedBy } = payload;

    if (!building || !unit || !resident || !plate || !vehicle || !color || duration === undefined || duration === null || !authorizedBy) {
      console.log('Missing fields check failed');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Please fill out every field before saving the pass.' }));
      return;
    }

    if (!['2 Sonic', '6 Sonic'].includes(building)) {
      console.log('Invalid building:', building);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Building must be 2 Sonic or 6 Sonic.' }));
      return;
    }

    const durationValue = Number(duration);
    console.log('Duration value:', durationValue, 'Type:', typeof durationValue);
    if (!Number.isInteger(durationValue) || durationValue < 0 || durationValue > 3) {
      console.log('Invalid duration:', durationValue);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Duration must be between 0 and 3 days. Use 0 for day-time parking until 11:59 PM.' }));
      return;
    }

    const state = await readData();
    console.log('State read from storage');
    const monthlyDaysUsed = countPassesForMonth(building, unit);
    console.log('Monthly days used:', monthlyDaysUsed);
    const hasException = isExceptionEnabled(building, unit);
    console.log('Has exception:', hasException);
    const overnightDays = Math.max(0, durationValue);
    if (monthlyDaysUsed + overnightDays > 10 && !hasException) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'This Building + Unit combination has reached the monthly limit of 10 overnight parking days. An admin exception can be granted for this unit.' }));
      return;
    }

    const createdAt = new Date().toISOString();
    const startDate = createdAt.split('T')[0];
    const endDate = durationValue === 0
      ? new Date(new Date(createdAt).setHours(23, 59, 59, 999))
      : new Date(new Date(createdAt).setDate(new Date(createdAt).getDate() + durationValue));

    const pass = {
      id: `pass-${Date.now()}`,
      building,
      unit,
      resident,
      plate,
      vehicle,
      color,
      duration: durationValue,
      authorizedBy,
      createdAt,
      startDate,
      endDate: endDate.toISOString()
    };

    state.passes.push(pass);
    console.log('Pass object created, writing to storage');
    await writeData(state);
    console.log('Pass written successfully');

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pass, message: 'Parking pass created successfully.' }));
  } catch (error) {
    console.error('ERROR in createPass:', error.message, error.stack);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Could not save the form data.' }));
  }
}

function deletePass(req, res, id) {
  (async () => {
    try {
      const state = await readData();
      state.passes = state.passes.filter((pass) => pass.id !== id);
      await writeData(state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete pass' }));
    }
  })();
}

module.exports = {
  listPasses,
  createPass,
  deletePass
};
