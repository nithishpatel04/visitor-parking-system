const { db } = require('../config/dynamodb');

// In-memory cache for quick access (will be refreshed from DynamoDB)
let cachedState = {
  passes: [],
  exceptions: [],
  exceptionHistory: []
};

let lastCacheUpdate = 0;
const CACHE_TTL = 5000; // 5 seconds

async function ensureDataInitialized() {
  // Initialize cache from DynamoDB on first load
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_TTL) {
    try {
      const passes = await db.getPasses();
      const exceptions = await db.getExceptions();
      
      cachedState.passes = passes || [];
      cachedState.exceptions = exceptions || [];
      cachedState.exceptionHistory = []; // Track in memory for this session
      
      lastCacheUpdate = now;
    } catch (error) {
      console.error("Error initializing cache:", error);
    }
  }
}

async function readData() {
  await ensureDataInitialized();
  return {
    passes: cachedState.passes || [],
    exceptions: cachedState.exceptions || [],
    exceptionHistory: cachedState.exceptionHistory || []
  };
}

async function writeData(data) {
  try {
    // Update local cache immediately
    cachedState = data;
    lastCacheUpdate = Date.now();
    
    // Persist to DynamoDB asynchronously (don't wait)
    if (data.passes && Array.isArray(data.passes)) {
      for (const pass of data.passes) {
        // Only sync new/modified passes
        try {
          await db.createPass(pass);
        } catch (error) {
          console.error("Error writing pass to DynamoDB:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error writing data:", error);
  }
}

module.exports = {
  readData,
  writeData
};

