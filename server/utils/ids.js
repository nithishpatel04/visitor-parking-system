const crypto = require('crypto');

function createId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

module.exports = { createId };
