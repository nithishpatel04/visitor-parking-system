const { getSummary, parkingTrend, incidentBreakdown } = require('../controllers/dashboardController');

function dashboardRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/dashboard/summary') {
    getSummary(req, res);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard/parking-trend') {
    parkingTrend(req, res);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard/incident-breakdown') {
    incidentBreakdown(req, res);
    return true;
  }

  return null;
}

module.exports = dashboardRoutes;
