// Helper function of converting size to bottles using in 
const convertToBottlesInDiffSizes = (sizeStr) => {
  if (!sizeStr) return { oneLtr: 0, halfLtr: 0 };

  const normalized = sizeStr.toLowerCase().trim();

  const sizeMap = {
    "1/2ltr":  { oneLtr: 0, halfLtr: 1 },
    "1/2 ltr": { oneLtr: 0, halfLtr: 1 },
    "0.5ltr":  { oneLtr: 0, halfLtr: 1 },
    "0.5 ltr": { oneLtr: 0, halfLtr: 1 },
    "500ml":   { oneLtr: 0, halfLtr: 1 },
    "1ltr":    { oneLtr: 1, halfLtr: 0 },
    "1 ltr":   { oneLtr: 1, halfLtr: 0 },
    "1.5ltr":  { oneLtr: 1, halfLtr: 1 },
    "1.5 ltr": { oneLtr: 1, halfLtr: 1 },
    "2ltr":    { oneLtr: 2, halfLtr: 0 },
    "2 ltr":   { oneLtr: 2, halfLtr: 0 },
    "2.5ltr":  { oneLtr: 2, halfLtr: 1 },
    "2.5 ltr": { oneLtr: 2, halfLtr: 1 },
    "3ltr":    { oneLtr: 3, halfLtr: 0 },
    "3 ltr":   { oneLtr: 3, halfLtr: 0 },
    "3.5ltr":  { oneLtr: 3, halfLtr: 1 },
    "3.5 ltr": { oneLtr: 3, halfLtr: 1 },
  };

  if (sizeMap[normalized]) return sizeMap[normalized];

  const match = normalized.match(/^(\d+\.?\d*)\s*(ltr|l|liter|ml)?$/);
  if (match) {
    const liters = parseFloat(match[1]);
    const oneLtr = Math.floor(liters);
    const halfLtr = Math.round((liters % 1) * 10) / 10 === 0.5 ? 1 : 0;
    return { oneLtr, halfLtr };
  }

  return { oneLtr: 0, halfLtr: 0 };
};

module.exports = { convertToBottlesInDiffSizes };