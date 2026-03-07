export function parseLocalDate(dateString) {
  if (!dateString) return null;

  // Expecting YYYY-MM-DD
  const [year, month, day] = dateString.split("-").map(Number);

  // Force LOCAL noon to avoid timezone rollback
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatLocalDate(dateString) {
  const date = parseLocalDate(dateString);
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
