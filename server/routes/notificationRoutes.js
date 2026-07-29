const { listNotifications, notificationsCount, markNotificationRead } = require('../controllers/notificationController');

function notificationRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/notifications') {
    listNotifications(req, res);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/notifications/count') {
    notificationsCount(req, res);
    return true;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/notifications/')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    markNotificationRead(req, res, id);
    return true;
  }

  return null;
}

module.exports = notificationRoutes;
