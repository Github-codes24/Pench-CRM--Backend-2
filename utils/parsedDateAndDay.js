// helper to parse various date formats to Date object
const parseUniversalDate = (dateStr) => {
  if (!dateStr) return null;

  // Handle Date objects
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }

  // Handle timestamps (numbers)
  if (typeof dateStr === "number") {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle string dates
  if (typeof dateStr !== "string") return null;

  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
  if (dateStr.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY format
  const separator = dateStr.includes("/") ? "/" : "-";
  const parts = dateStr.split(separator);

  if (parts.length !== 3) return null;

  // Check if it's DD-MM-YYYY or DD/MM/YYYY format (day is first)
  if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
    const [day, month, year] = parts;
    const date = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    );
    return isNaN(date.getTime()) ? null : date;
  }

  // Check if it's YYYY-MM-DD format (year is first)
  if (parts[0].length === 4 && parts[1].length <= 2 && parts[2].length <= 2) {
    const [year, month, day] = parts;
    const date = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    );
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const formatDateToDDMMYYYY = (date) => {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

module.exports = {
  parseUniversalDate,
  formatDateToDDMMYYYY,
};
