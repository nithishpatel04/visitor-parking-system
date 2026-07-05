// Simple authentication service with DynamoDB sessions
// In production, use bcrypt for password hashing and JWT for tokens

const crypto = require('crypto');
const { db } = require('../config/dynamodb');

// Demo users (in production, store these securely)
const USERS = [
  { id: 1, username: 'concierge', password: '1234', role: 'concierge', name: 'Concierge' },
  { id: 2, username: 'manager', password: '1234', role: 'manager', name: 'Property Manager' },
  { id: 3, username: 'admin', password: '1234', role: 'admin', name: 'Administrator' }
];

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
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
  
  // Store in DynamoDB
  await db.createSession(token, sessionData);
  
  return { token, user: sessionData };
}

async function validateSession(token) {
  try {
    const session = await db.getSession(token);
    if (!session) {
      return null;
    }
    
    // Check if session is still valid (24 hours)
    const sessionAge = Date.now() - session.createdAt;
    if (sessionAge > 24 * 60 * 60 * 1000) {
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
