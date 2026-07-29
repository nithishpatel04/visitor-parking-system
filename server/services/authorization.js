const { validateSession } = require('./authService');
const { writeJson } = require('../utils/response');

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function requireAuth(req, res, allowedRoles = []) {
  const token = getBearerToken(req);
  if (!token) {
    writeJson(res, 401, { error: 'Invalid or expired session' });
    return null;
  }

  const session = await validateSession(token);
  if (!session) {
    writeJson(res, 401, { error: 'Invalid or expired session' });
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    writeJson(res, 403, { error: 'Permission denied' });
    return null;
  }

  return session;
}

module.exports = { getBearerToken, requireAuth };
