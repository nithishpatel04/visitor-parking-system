const { readData, writeData } = require('./storage');

function getExceptionEntry(state, building, unit) {
  return state.exceptions.find((entry) => entry.building === building && entry.unit === unit);
}

function hasActiveException(entry) {
  if (!entry || !entry.enabled) {
    return false;
  }

  if (!entry.expiresAt) {
    return true;
  }

  return new Date(entry.expiresAt) > new Date();
}

function isExceptionEnabled(building, unit) {
  const state = readData();
  const entry = getExceptionEntry(state, building, unit);
  return hasActiveException(entry);
}

function setException(building, unit, enabled, reason = '', days = 0) {
  const state = readData();
  const existing = getExceptionEntry(state, building, unit);
  const normalizedDays = Math.max(0, Number(days) || 0);
  const isEnabled = Boolean(enabled) && normalizedDays > 0;
  const expiresAt = isEnabled ? new Date(Date.now() + normalizedDays * 24 * 60 * 60 * 1000).toISOString() : null;

  if (existing) {
    existing.enabled = isEnabled;
    existing.reason = reason;
    existing.days = normalizedDays;
    existing.expiresAt = expiresAt;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.exceptions.push({
      building,
      unit,
      enabled: isEnabled,
      reason,
      days: normalizedDays,
      expiresAt,
      updatedAt: new Date().toISOString()
    });
  }

  state.exceptionHistory.push({
    building,
    unit,
    enabled: isEnabled,
    reason,
    days: normalizedDays,
    expiresAt,
    createdAt: new Date().toISOString()
  });

  writeData(state);
  return {
    building,
    unit,
    enabled: isEnabled,
    reason,
    days: normalizedDays,
    expiresAt,
    updatedAt: new Date().toISOString()
  };
}

function getExceptions() {
  const state = readData();
  return state.exceptions;
}

function getExceptionHistory() {
  const state = readData();
  return state.exceptionHistory;
}

module.exports = {
  getExceptionEntry,
  isExceptionEnabled,
  setException,
  getExceptions,
  getExceptionHistory
};
