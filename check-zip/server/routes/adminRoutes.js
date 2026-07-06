const { getAdminSummary, updateException } = require('../controllers/adminController');

function adminRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/admin/units') {
    getAdminSummary(req, res);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/exceptions') {
    getAdminSummary(req, res);
    return true;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/admin/exceptions/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const building = decodeURIComponent(parts[3] || '');
    const unit = decodeURIComponent(parts[4] || '');
    updateException(req, res, building, unit);
    return true;
  }

  return null;
}

module.exports = adminRoutes;
