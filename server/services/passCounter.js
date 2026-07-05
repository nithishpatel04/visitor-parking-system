const { readData } = require('./storage');

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function countPassesForMonth(building, unit, date = new Date()) {
  const state = readData();
  const key = getMonthKey(date);
  return state.passes.reduce((total, pass) => {
    const passDate = new Date(pass.createdAt);
    if (pass.building !== building || pass.unit !== unit || getMonthKey(passDate) !== key) {
      return total;
    }
    const dayCount = Number(pass.duration) > 0 ? Number(pass.duration) : 0;
    return total + dayCount;
  }, 0);
}

function getUnitsAtLimit(date = new Date()) {
  const state = readData();
  const key = getMonthKey(date);
  const buckets = new Map();

  state.passes.forEach((pass) => {
    const passDate = new Date(pass.createdAt);
    if (getMonthKey(passDate) !== key) {
      return;
    }
    const combo = `${pass.building}::${pass.unit}`;
    const dayCount = Number(pass.duration) > 0 ? Number(pass.duration) : 0;
    buckets.set(combo, (buckets.get(combo) || 0) + dayCount);
  });

  return Array.from(buckets.entries())
    .filter(([, count]) => count >= 10)
    .map(([combo]) => combo);
}

module.exports = {
  countPassesForMonth,
  getUnitsAtLimit
};
