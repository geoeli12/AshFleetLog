// src/utils/date.js
// Helpers to avoid timezone off-by-one when backend returns a DATE string like "YYYY-MM-DD".
// JS parses date-only ISO strings as UTC midnight, which can display as the previous day in US timezones.

export function parseLocalDate(value) {
  if (!value) return null;

  // If it's already a Date
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  // Accept numbers (timestamps)
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== "string") return null;

  const s = value.trim();
  if (!s) return null;

  // DATE-only: YYYY-MM-DD  -> construct as local noon (safe across DST)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d, 12, 0, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // For ISO strings with time (with or without timezone), Date() is fine
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export function toDateOrNull(value) {
  return parseLocalDate(value);
}
