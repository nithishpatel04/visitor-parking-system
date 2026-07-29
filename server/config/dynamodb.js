const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

// Use the Lambda execution role / default AWS credential chain.
const client = new DynamoDBClient({ region });

const docClient = DynamoDBDocumentClient.from(client);

// Table names (you'll create these in AWS)
const TABLES = {
  PASSES: process.env.PASSES_TABLE || process.env.DYNAMODB_PASSES_TABLE || "passes",
  SESSIONS: process.env.SESSIONS_TABLE || process.env.DYNAMODB_SESSIONS_TABLE || "sessions",
  EXCEPTIONS: process.env.EXCEPTIONS_TABLE || process.env.DYNAMODB_EXCEPTIONS_TABLE || "exceptions",
  SHIFT_LOGS: process.env.SHIFT_LOGS_TABLE || "shift-logs",
  INCIDENT_REPORTS: process.env.INCIDENT_REPORTS_TABLE || "incident-reports",
  NOTIFICATIONS: process.env.NOTIFICATIONS_TABLE || "notifications"
};

// Helper functions for DynamoDB operations
const db = {
  // Passes table operations
  async getPasses() {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLES.PASSES
      }));
      return result.Items || [];
    } catch (error) {
      console.error("Error getting passes:", error);
      return [];
    }
  },

  async createPass(pass) {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLES.PASSES,
        Item: {
          id: pass.id,
          building: pass.building,
          unit: pass.unit,
          resident: pass.resident,
          plate: pass.plate,
          vehicle: pass.vehicle,
          color: pass.color,
          duration: pass.duration,
          authorizedBy: pass.authorizedBy,
          createdAt: pass.createdAt,
          startDate: pass.startDate,
          endDate: pass.endDate,
          ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
        }
      }));
      return pass;
    } catch (error) {
      console.error("Error creating pass:", error);
      throw error;
    }
  },

  async deletePass(id) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLES.PASSES,
        Key: { id }
      }));
    } catch (error) {
      console.error("Error deleting pass:", error);
      throw error;
    }
  },

  // Sessions table operations
  async getSession(token) {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLES.SESSIONS,
        Key: { token }
      }));
      return result.Item || null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  },

  async createSession(token, sessionData) {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLES.SESSIONS,
        Item: {
          token,
          ...sessionData,
          ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours TTL
        }
      }));
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  },

  async deleteSession(token) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLES.SESSIONS,
        Key: { token }
      }));
    } catch (error) {
      console.error("Error deleting session:", error);
      throw error;
    }
  },

  // Exceptions table operations
  async getExceptions() {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLES.EXCEPTIONS
      }));
      return result.Items || [];
    } catch (error) {
      console.error("Error getting exceptions:", error);
      return [];
    }
  },

  async setException(building, unit, days, reason) {
    try {
      const exceptionKey = `${building}::${unit}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      await docClient.send(new PutCommand({
        TableName: TABLES.EXCEPTIONS,
        Item: {
          id: exceptionKey,
          building,
          unit,
          enabled: true,
          days,
          reason,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
          ttl: Math.floor(expiresAt.getTime() / 1000)
        }
      }));
    } catch (error) {
      console.error("Error setting exception:", error);
      throw error;
    }
  },

  async updateException(building, unit, enabled) {
    try {
      const exceptionKey = `${building}::${unit}`;
      await docClient.send(new UpdateCommand({
        TableName: TABLES.EXCEPTIONS,
        Key: { id: exceptionKey },
        UpdateExpression: "SET enabled = :enabled",
        ExpressionAttributeValues: {
          ":enabled": enabled
        }
      }));
    } catch (error) {
      console.error("Error updating exception:", error);
      throw error;
    }
  },

  async getException(building, unit) {
    try {
      const exceptionKey = `${building}::${unit}`;
      const result = await docClient.send(new GetCommand({
        TableName: TABLES.EXCEPTIONS,
        Key: { id: exceptionKey }
      }));
      return result.Item || null;
    } catch (error) {
      console.error("Error getting exception:", error);
      return null;
    }
  }
};

module.exports = { db, TABLES, docClient, GetCommand, PutCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand };
