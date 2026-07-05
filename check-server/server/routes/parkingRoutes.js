const { listPasses, createPass, deletePass } = require('../controllers/parkingController');

function parkingRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/passes') {
    listPasses(req, res, url.searchParams);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/passes') {
    createPass(req, res);
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/passes/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    deletePass(req, res, id);
    return true;
  }

  return null;
}

module.exports = parkingRoutes;
