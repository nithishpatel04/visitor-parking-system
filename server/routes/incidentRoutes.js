const { listIncidents, getIncident, createIncident, updateIncident, submitIncident, deleteIncident, attachmentUploadUrl, attachmentDownloadUrl } = require('../controllers/incidentController');

function incidentRoutes(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/incidents') {
    listIncidents(req, res, url);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/incidents') {
    createIncident(req, res);
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/incidents/') && url.pathname.endsWith('/attachment-download-url')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    attachmentDownloadUrl(req, res, id);
    return true;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/incidents/') && url.pathname.endsWith('/attachment-upload-url')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    attachmentUploadUrl(req, res, id);
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/incidents/')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    getIncident(req, res, id);
    return true;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/incidents/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = decodeURIComponent(parts[2] || '');
    if (parts[3] === 'submit') {
      submitIncident(req, res, id);
      return true;
    }
    updateIncident(req, res, id);
    return true;
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/incidents/') && url.pathname.endsWith('/submit')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    submitIncident(req, res, id);
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/incidents/')) {
    const id = decodeURIComponent(url.pathname.split('/')[3] || '');
    deleteIncident(req, res, id);
    return true;
  }

  return null;
}

module.exports = incidentRoutes;
