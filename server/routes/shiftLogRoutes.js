const { listShiftLogs, getShiftLog, createShiftLog, updateShiftLog, submitShiftLog, deleteShiftLog } = require('../controllers/shiftLogController');

function shiftLogRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/shift-logs') {
    listShiftLogs(req, res, url);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/shift-logs') {
    createShiftLog(req, res);
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/shift-logs/')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    getShiftLog(req, res, id);
    return true;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/shift-logs/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = decodeURIComponent(parts[2] || '');
    if (parts[3] === 'submit') {
      submitShiftLog(req, res, id);
      return true;
    }
    updateShiftLog(req, res, id);
    return true;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/shift-logs/') && url.pathname.endsWith('/submit')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    submitShiftLog(req, res, id);
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/shift-logs/')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    deleteShiftLog(req, res, id);
    return true;
  }

  return null;
}

module.exports = shiftLogRoutes;
