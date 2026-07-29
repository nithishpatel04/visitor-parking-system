// Simple authentication service with DynamoDB sessions
// In production, use bcrypt for password hashing and JWT for tokens

const crypto = require('crypto');
const { db } = require('../config/dynamodb');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || process.env.JWT_SECRET || 'change-this-secret';

// Demo users (in production, store these securely)
const USERS = [
  { id: 1, username: 'concierge', password: '1234', role: 'concierge', name: 'Concierge' },
  { id: 2, username: 'manager', password: '1234', role: 'manager', name: 'Property Manager' },
  { id: 3, username: 'admin', password: '1234', role: 'admin', name: 'Administrator' }
];

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encodedPayload) {
  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', FALLBACK_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function issueFallbackToken(sessionData) {
  const payload = {
    ...sessionData,
    exp: Date.now() + SESSION_TTL_MS
  };
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);
  return `local.${encodedPayload}.${signature}`;
}

function validateFallbackToken(token) {
  if (!token || !token.startsWith('local.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const encodedPayload = parts[1];
  const signature = parts[2];
  const expectedSignature = signPayload(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const matches = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );

  if (!matches) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload || !payload.exp || Date.now() > payload.exp) {
    return null;
  }

  const { exp, ...sessionData } = payload;
  return sessionData;
}

function authenticateUser(username, password) {
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return null;
  }
  return user;
}

async function createSession(user) {
  const token = generateToken();
  const sessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    createdAt: Date.now()
  };

  try {
    // Preferred: persistent session in DynamoDB.
    await db.createSession(token, sessionData);
    return { token, user: sessionData };
  } catch (error) {
    // Fallback: allow login even if DynamoDB credentials or table access are broken.
    console.error('Failed to persist session in DynamoDB, using stateless fallback token:', error);
    const fallbackToken = issueFallbackToken(sessionData);
    return { token: fallbackToken, user: sessionData };
  }
}

async function validateSession(token) {
  const fallbackSession = validateFallbackToken(token);
  if (fallbackSession) {
    return fallbackSession;
  }

  try {
    const session = await db.getSession(token);
    if (!session) {
      return null;
    }

    // Check if session is still valid (24 hours)
    const sessionAge = Date.now() - session.createdAt;
    if (sessionAge > SESSION_TTL_MS) {
      await db.deleteSession(token);
      return null;
    }

    return session;
  } catch (error) {
    console.error("Error validating session:", error);
    return null;
  }
}

async function destroySession(token) {
  if (token && token.startsWith('local.')) {
    return;
  }

  try {
    await db.deleteSession(token);
  } catch (error) {
    console.error("Error destroying session:", error);
  }
}

module.exports = {
  authenticateUser,
  createSession,
  validateSession,
  destroySession
};
